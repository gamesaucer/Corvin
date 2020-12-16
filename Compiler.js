
class Type {
  constructor (isValueOfType) {
    this.subTypes = {}
    this.isValueOfType = isValueOfType
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
class CList {}
class CMaybe {}
class CMutable {}
class CMap extends CIterable {}
class CRange {}
class CTuple {}
class CType {}

const TYPES = {
  Any: new Type(n => true),
  Boolean: new Type(n => typeof n === 'boolean'),
  Char: new Type(n => n.length === 1 || (n >= 0 && n <= 0x10FFFF)),
  Function: new Type(n => n instanceof CFunction),
  Integer: new Type(n => Math.trunc(n) === n),
  Iterable: new Type(n => n instanceof CIterable),
  List: new Type(n => n instanceof CList),
  Map: new Type(n => n instanceof CMap),
  Maybe: new Type(n => n instanceof CMaybe),
  Mutable: new Type(n => n instanceof CMutable),
  Negative: new Type(n => n < 0),
  None: new Type(n => false),
  Number: new Type(n => typeof n === 'number'),
  Positive: new Type(n => n > 0),
  Range: new Type(n => n instanceof CRange),
  Tuple: new Type(n => n instanceof CTuple),
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
TYPES.Map.setSubTypes([TYPES.Tuple, TYPES.List])
TYPES.String.setSubTypes([TYPES.Char])
TYPES.Unsigned.setSubTypes([TYPES.Positive, TYPES.Zero])

// For debug purposes
for (const t in TYPES) {
  TYPES[t].name = t
}

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
  deriveTypes(program, Object.assign({}, GLOBAL_IDS), {
    returnCb: n => err(n, 'Cannot return from a non-function'),
    breakCb: n => err(n, 'Cannot break from a non-loop')
  })
  return program
}

function err (node, msg) {
  console.error('line:', node.location.line, 'column:', node.location.column)
  throw new Error(msg)
}

function deriveTypes (node, identifierList = {}, extra = {}) {
  // extra = Object.assign({}, extra)
  node.returns = []
  switch (node.type) {
    case 'Program':
    case 'Block': {
      const scope = Object.assign({}, identifierList)
      node.value.forEach(node => deriveTypes(node, scope, extra))
      node.returns.push(node.value[node.value.length - 1].returns)
    } break
    case 'BinaryExpression':
      deriveTypes(node.left, identifierList, extra)
      deriveTypes(node.right, identifierList, extra)
      // Todo: reconcile both sides of expression
      node.returns.push(node.left.returns)
      break
    case 'UnaryExpression':
    case 'UpdateExpression':
      deriveTypes(node.argument, identifierList, extra)
      node.returns.push(node.argument.returns)
      break
    case 'Identifier':
      node.returns.push(identifierList[node.value] ||
        err(node, 'Identifier not previously declared'))
      break
    case 'DeclarationExpression':
      identifierList[node.left.value] || err(node, 'Identifier not previously declared')
      identifierList[node.right.value] = getType(TYPES[node.left.value])
      node.returns.push(getType(TYPES.Maybe, TYPES[node.left.value]))
      break
    case 'AssignmentExpression':
      deriveTypes(node.left, identifierList, extra)
      deriveTypes(node.right, identifierList, extra)
      // Todo: reconcile both sides of expression
      node.returns.push(node.right.returns)
      break
    // TODO resolve whether all branches are guaranteed to return, and if so, omit the close block return.
    case 'Return':
      deriveTypes(node.value, identifierList, extra)
      node.returns.push(node.value.returns)
      extra.returnCb(node)
      break
    // TODO resolve whether all branches are guaranteed to break, and if so, omit the close block return.
    case 'Break':
      deriveTypes(node.value, identifierList, extra)
      node.returns.push(node.value.returns)
      extra.breakCb(node)
      break
    case 'Empty':
      node.returns.push(getType(TYPES.None))
      break
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'StringLiteral':
      node.returns.push(typesOfValue(node.value))
      break
    case 'Tuple':
      node.returns.push(getType(TYPES.Tuple, ...node.value.map(node => {
        deriveTypes(node, identifierList, extra)
        return node.returns
      })))
      break
    case 'Conditional': {
      const scopeC = Object.assign({}, identifierList)
      deriveTypes(node.consequent, scopeC, extra)
      if (node.alternate) {
        const scopeA = Object.assign({}, identifierList)
        deriveTypes(node.alternate, scopeA, extra)
      }
      node.returns.push([
        node.consequent.returns,
        node.alternate ? node.alternate.returns : getType(TYPES.None)
      ])
    } break
    case 'DoLoop': {
      const scope = Object.assign({}, identifierList)
      deriveTypes(node.value, scope, { ...extra, breakCb: n => { if (nodeReturnsNone(n)) { node.returns.push(n.returns) } } })
      node.returns.push(getType(TYPES.List, node.value.returns))
    } break
    case 'DoWhileLoop':
    case 'DoUntilLoop':
    case 'WhileLoop':
    case 'UntilLoop': {
      const scope = Object.assign({}, identifierList)
      deriveTypes(node.value, scope, { ...extra, breakCb: n => { if (nodeReturnsNone(n)) { node.returns.push(n.returns) } } })
      deriveTypes(node.test, node.type[0] === 'D' ? scope : identifierList, extra)
      node.returns.push(getType(TYPES.List, node.value.returns))
    } break
    case 'FunctionDeclaration': {
      const scope = Object.assign({}, node.operator === '->' ? identifierList : GLOBAL_IDS)
      const returns = []
      deriveTypes(node.left, scope, extra)
      deriveTypes(node.right, scope, { ...extra, returnCb: n => returns.push(n.returns) })
      returns.push(node.right.returns)
      node.returns.push(getType(TYPES.Function, distinct(returns.flat(2))))
    } break
    case 'ParameterList':
      node.value.forEach(node => deriveTypes(node, identifierList, extra))
      node.returns.push(getType(TYPES.None))
      break
    default:
      console.warn('oops, forgot', node.type)
      node.returns.push(getType(TYPES.None))
  }
  node.returns = distinct(node.returns.flat(2))
}

function typesOfValue (n) {
  return TYPES.Any.typesOfValue(n).map(type => getType(type))
}

function getType (type = TYPES.Any, ...parameters) {
  return [{ type, parameters }]
}

function distinct (nodes) {
  // Todo check deep equality
  return Array.from(new Set(nodes))

  /* nodes.reduce((acc, cur,) => {

  }, []) */
}

function nodeReturnsNone (n) {
  return n.value.returns.length > 1 || n.value.returns[0].type !== TYPES.None
}
