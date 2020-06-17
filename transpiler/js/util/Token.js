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
    Object.defineProperty(this, 'tokenOptions', { get () { return tokenOptions } })
  }

  matchOf (str) {
    const r = super.matchOf(str)
    this.setOccurrence = (...args) => {
      const copy = new TempToken(this.name, this.matcher, this.tokenOptions.filter(t => t.matchOf(str)))
      copy.occurrence = new TokenOccurrence(...args)
      return copy
    }
    return r
  }

  setOccurrence (...args) {
    const copy = new TempToken(this.name, this.matcher, this.tokenOptions)
    copy.occurrence = new TokenOccurrence(...args)
    return copy
  }
}

class OpToken extends Token {
  constructor (name, matcher, precedence, argPlaces) {
    super(name, type.OP, matcher)
    this.precedence = precedence
    // this.associativity = precedence[0] // associativity
    this.argPlaces = argPlaces
  }

  setOccurrence (...args) {
    const copy = new OpToken(this.name, this.matcher, this.precedence, this.argPlaces)
    copy.occurrence = new TokenOccurrence(...args)
    return copy
  }
}

module.exports = { Token, TempToken, OpToken }
