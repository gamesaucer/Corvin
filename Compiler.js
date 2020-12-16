
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

/**
 * Compiles the program. Doesn't do anything quite yet at the moment.
 */
function compile () {

}
