
class Type {
  constructor (isValueOfType, paramCount = 0) {
    this.subTypes = {}
    this.isValueOfType = isValueOfType
    this.paramCount = paramCount
  }

  setSubTypes (types) {
    this.subTypes = types
  }

  /**
     * Will find more specific types for the return value if
     * it belongs to any more specific types.
     * @param {Object} n - the value to return the type of
     * @returns {Type[]} - a list of subtypes, itself, or nothing.
     */
  typesOfValue (n) {
    if (!this.isValueOfType(n)) {
      return []
    } else {
      const subValues = Object.values(this.subTypes).map(type => type.typesOfValue(n)).flat()
      if (subValues.length === 0) {
        return [this]
      } else {
        return subValues
      }
    }
  }
}

class CFunction {}
class CIterable {}
class CMaybe {}
class CMutable {}
class CMap extends CIterable {}
class CType {}

const TYPES = {
  Any: new Type(n => true),
  Boolean: new Type(n => typeof n === 'boolean'),
  Char: new Type(n => n.length === 1 || (n >= 0 && n <= 0x10FFFF)),
  Function: new Type(n => n instanceof CFunction, 1),
  Integer: new Type(n => Math.trunc(n) === n),
  Iterable: new Type(n => n instanceof CIterable),
  Map: new Type(n => n instanceof CMap, 2),
  Maybe: new Type(n => n instanceof CMaybe, 1),
  Mutable: new Type(n => n instanceof CMutable, 1),
  Negative: new Type(n => n < 0),
  None: new Type(n => false),
  Number: new Type(n => typeof n === 'number'),
  Positive: new Type(n => n > 0),
  Type: new Type(n => n instanceof CType),
  String: new Type(n => typeof n === 'string'),
  Unsigned: new Type(n => n >= 0),
  Zero: new Type(n => n === 0)
}
TYPES.Int = TYPES.Integer

TYPES.Any.setSubTypes([
  TYPES.Boolean,
  TYPES.Function,
  TYPES.Iterable,
  TYPES.Maybe,
  TYPES.Mutable,
  TYPES.Number,
  TYPES.String,
  TYPES.Type])
TYPES.Number.setSubTypes([TYPES.Integer, TYPES.Negative, TYPES.Unsigned])
TYPES.Integer.setSubTypes([TYPES.Char])
TYPES.Iterable.setSubTypes([TYPES.Map])
TYPES.String.setSubTypes([TYPES.Char])
TYPES.Unsigned.setSubTypes([TYPES.Positive, TYPES.Zero])

const GLOBAL_IDS = Object.keys(TYPES).reduce((t, key) => {
  const s = {}
  s[key] = TYPES.Type
  return Object.assign(t, s)
}, {})

const LIBRARIES = {
  std: {
    out: {
      print: console.log,
      println: (...args) => console.log(...args, '\n')
    },
    math: {
      // Constants
      pi: Math.PI,
      e: Math.E,

      // Basic arithmetic
      abs: Math.abs,
      ceil: Math.ceil,
      floor: Math.floor,
      round: Math.round,
      sign: Math.sign,
      frac: n => n - Math.trunc,
      trunc: Math.trunc,
      min: Math.min,
      max: Math.max,
      clamp: (low, n, high) => Math.min(high, Math.max(n, low)),

      // Advanced arithmetic
      sqrt: Math.sqrt,
      cbrt: Math.cbrt,
      yrt: (x, y) => Math.pow(x, 1 / y),
      pow: Math.pow
    }
  }
}

/**
 * Compiles the program. Doesn't do anything quite yet at the moment.
 */
function compile (program) {
  deriveTypes(program, Object.assign({}, GLOBAL_IDS))
  return program
}

function err (msg, ...args) {
  console.error(args)
  throw new Error(msg)
}

function deriveTypes (node, identifierList = {}) {
  switch (node.type) {
    case 'Program':
    case 'Block': {
      const scope = Object.assign({}, identifierList)
      node.value.forEach(node => deriveTypes(node, scope))
      node.returns = node.value[node.value.length - 1].returns
    } break
    case 'BinaryExpression':
      deriveTypes(node.left, identifierList)
      deriveTypes(node.right, identifierList)
      node.returns = node.left.returns
      break
    case 'UnaryExpression':
      deriveTypes(node.argument, identifierList)
      node.returns = node.argument.returns
      break
    case 'Identifier':
      node.returns = identifierList[node.value] || err('Identifier not previously declared', node.type, node.value, identifierList)
      break
    case 'DeclarationExpression':
      identifierList[node.left.value] || err('Identifier not previously declared', node.type, node.left.value)
      identifierList[node.right.value] = TYPES[node.left.value]
      node.returns = TYPES[node.left.value]
      break
    case 'AssignmentExpression':
      deriveTypes(node.left, identifierList)
      deriveTypes(node.right, identifierList)
      node.returns = node.right.returns
      break
    case 'Empty':
      node.returns = TYPES.None
      break
    case 'NumericLiteral':
    case 'StringLiteral':
      node.returns = TYPES.Any.typesOfValue(node.value)
      break
    default:
      console.warn('oops, forgot', node.type)
      node.returns = TYPES.None
  }
}
