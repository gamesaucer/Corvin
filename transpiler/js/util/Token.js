const TokenOccurrence = require('./TokenOccurrence')
const type = require('./TokenTypes')

class Token {
  constructor (name, type, matcher) {
    Object.defineProperty(this, 'name', { get () { return name } })
    Object.defineProperty(this, 'type', { get () { return type } })
    Object.defineProperty(this, 'matcher', { get () { return matcher } })
  }

  matchOf (str) {
    switch (this.matcher.constructor) {
      case RegExp: return str.match(this.matcher)
      case Function : return this.matcher(str)
      default: return this.matcher
    }
  }

  setOccurrence (...args) {
    const copy = new Token(this.name, this.type, this.matcher)
    copy.occurrence = new TokenOccurrence(...args)
    return copy
  }
}

class TempToken extends Token {
  constructor (name, matcher, tokenOptions) {
    super(name, type.TEMP, matcher)
    // this.tokenOptions = tokenOptions
    Object.defineProperty(this, 'tokenOptions', {
      get () { return tokenOptions },
      set (a) { return new TempToken(this.name, this.matcher, a) }
    })
  }
}

class OpToken extends Token {
  constructor (name, matcher, precedence, associativity, argPlaces) {
    super(name, type.OP, matcher)
    this.precedence = precedence
    this.associativity = associativity
    this.argPlaces = argPlaces
  }
}

module.exports = { Token, TempToken, OpToken }
