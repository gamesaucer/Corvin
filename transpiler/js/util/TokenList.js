class TokenOccurence {
  constructor (content, totalLength) {
    this.location = null
    this.content = content
    this.totalLength = totalLength || content.length
  }

  setLocation (pos, str) {
    const s = str.slice(0, pos)
    this.location = {
      neighbourhood: [str.slice(Math.max(pos - 10, 0), pos), str.slice(pos, pos + 10)],
      line: (s.match(/\n/g) || []).length + 1,
      column: pos - (l => l >= 0 ? l + 1 : 0)(s.lastIndexOf('\n'))
    }
    var n
    if ((n = this.location.neighbourhood[0].lastIndexOf('\n')) !== -1) {
      this.location.neighbourhood[0].splice(0, n + 1)
    }
    if ((n = this.location.neighbourhood[1].indexOf('\n')) !== -1) {
      this.location.neighbourhood[1].splice(n)
    }
  }
}

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
    const copy = Object.assign({}, this)
    copy.occurrence = new TokenOccurence(...args)
    return copy
  }
}

/*
const match = t.matchOf(str)
    if (match) {
      return new Token(
        t.n instanceof Array ? match[0] : t.n,
        0, 0, 0, // Fill in later
        match[1] || match[0] || match,
        match[1] ? match[0].length : null)
    }
*/

/*
class Token {
  constructor (type, pos, row, col, symbol = type, length) {
    this.type = type
    this.row = row
    this.col = col
    this.pos = pos
    this.symbol = symbol
    this.length = length || symbol.length
  }
}
*/

class TempToken extends Token {
  constructor (name, matcher, tokenOptions) {
    super(name, type.TEMP, matcher)
    this.tokenOptions = tokenOptions
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

const type = {
  INVALID: Symbol('Invalid token, meant to be removed'),
  LIT: Symbol('Literal value, able to be evaluated at compile time'),
  IDENT: Symbol('Identifier, i.e. non-reserved names'),
  SEP: Symbol('Seperator, demarcates expressions'),
  OP: Symbol('Operator, does an operation on values or identifiers.'),
  TEMP: Symbol('Ambiguous without context, meant for the parser to determine the context of.')
}

// These are in order of precedence; don't change the order.
const prec = {
  // Decided that maybe/option should probably just be a no-op in case of null
  POST_N_ACCESS: Symbol('a-- a++ a?.b a.b a? a@?'),
  PRE_N_NOT: Symbol('--a ++a -a +a !a ~a @a'),
  MATH_POW: Symbol('a**b'),
  MATH_MULT: Symbol('a/b a*b a%b'),
  MATH_PLUS: Symbol('a-b a+b'),
  BITSHIFT: Symbol('a<<b a>>b'),
  RANGE: Symbol('a..b'),
  LT_N_GT: Symbol('a>=b a<=b a>b a<b'),
  EQ_N_NEQ: Symbol('a!=b a==b'),
  B_AND: Symbol('a&b'),
  B_XOR: Symbol('a^b'),
  B_OR: Symbol('a|b'),
  L_AND: Symbol('a&&b'),
  L_XOR: Symbol('a^^b'),
  L_OR: Symbol('a||b'),
  ASSIGN: Symbol('a=b a+=b a-=b a*=b a/=b a%=b a**=b a^=b a|=b a&=b a<<=b a>>=b'),
  EACH: Symbol('a:b')
}

const assoc = {
  LEFT: -1,
  RIGHT: 1
}

const args = {
  LEFT: -1,
  BOTH: 0,
  RIGHT: 1
}

const tokenList = [
  // Space-like characters and comments should be ignored
  new Token(null, type.INVALID, /^[\s]+/),
  new Token(null, type.INVALID, /^\/\/.*/),
  new Token(null, type.INVALID, matchNestedBlockComment),

  new Token('STR_NOESC', type.LIT, /^"""(.*?)"""/),
  new Token('STR', type.LIT, /^"(.*?(?<!\\)(?:\\\\)*)"/),
  new Token('CHAR', type.LIT, /^'(.*?(?<!\\)(?:\\\\)*)'/),

  // TODO: add (?![^]), adding all reserved characters to the character list.
  // This means that a space will be required between numbers and words.
  new Token('FRAC', type.LIT, /^([0-9]+\.[0-9]*|[0-9]*\.[0-9]+)/),
  new Token('INT', type.LIT, /^[0-9]+/),
  new Token('INT', type.LIT, /^0[xX][0-9a-fA-F]+/),
  new Token('INT', type.LIT, /^0[bB][01]+/),
  new Token('INT', type.LIT, /^0[oO][0-8]+/),

  new OpToken('ASSIGN', /^=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('ADD_ASSIGN', /^\+=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('SUB_ASSIGN', /^-=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('MUL_ASSIGN', /^\*=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('DIV_ASSIGN', /^\/=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('MOD_ASSIGN', /^%=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('POW_ASSIGN', /^\*{2}=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('XOR_ASSIGN', /^\^=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('OR_ASSIGN', /^\|=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('AND_ASSIGN', /^&=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('LEFT_ASSIGN', /^<{2}=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),
  new OpToken('RIGHT_ASSIGN', /^>{2}=/, prec.ASSIGN, assoc.RIGHT, args.BOTH),

  new TempToken('MIN_MIN', /^-{2}/, [
    new OpToken('DEC_POST', false, prec.POST_N_ACCESS, assoc.LEFT, args.LEFT),
    new OpToken('DEC_PRE', false, prec.PRE_N_NOT, assoc.RIGHT, args.RIGHT)
  ]),

  new TempToken('PLUS_PLUS', /^\+{2}/, [
    new OpToken('INC_POST', false, prec.POST_N_ACCESS, assoc.LEFT, args.LEFT),
    new OpToken('INC_PRE', false, prec.PRE_N_NOT, assoc.RIGHT, args.RIGHT)
  ]),

  new TempToken('MIN', /^-(?!=)/, [
    new OpToken('SUB', false, prec.MATH_PLUS, assoc.LEFT, args.BOTH),
    new OpToken('NEG', false, prec.PRE_N_NOT, assoc.RIGHT, args.RIGHT)
  ]),

  new TempToken('PLUS', /^\+(?!=)/, [
    new OpToken('ADD', false, prec.MATH_PLUS, assoc.LEFT, args.BOTH),
    new OpToken('POS', false, prec.PRE_N_NOT, assoc.RIGHT, args.RIGHT)
  ]),

  new OpToken('POW', /^\*{2}(?!=)/, prec.MATH_POW, assoc.LEFT, args.BOTH),
  new OpToken('DIV', /^\/(?!=)/, prec.MATH_MULT, assoc.LEFT, args.BOTH),
  new OpToken('MUL', /^\*(?!=)/, prec.MATH_MULT, assoc.LEFT, args.BOTH),
  new OpToken('MOD', /^%(?!=)/, prec.MATH_MULT, assoc.LEFT, args.BOTH),

  new OpToken('NOT', /^!(?!=)/, prec.PRE_N_NOT, assoc.RIGHT, args.RIGHT),
  new OpToken('AND', /^&{2}/, prec.L_AND, assoc.LEFT, args.BOTH),
  new OpToken('OR', /^\|{2}/, prec.L_OR, assoc.LEFT, args.BOTH),
  new OpToken('XOR', /^\^{2}/, prec.L_XOR, assoc.LEFT, args.BOTH),
  new OpToken('BIT_XOR', /^\^(?!=)/, prec.B_XOR, assoc.LEFT, args.BOTH),
  new OpToken('BIT_OR', /^\|(?!=)/, prec.B_OR, assoc.LEFT, args.BOTH),
  new OpToken('BIT_AND', /^&(?!=)/, prec.B_AND, assoc.LEFT, args.BOTH),
  new OpToken('BIT_NOT', /^~/, prec.PRE_N_NOT, assoc.RIGHT, args.RIGHT),
  new OpToken('BIT_LEFT', /^<{2}(?!=)/, prec.BITSHIFT, assoc.LEFT, args.BOTH),
  new OpToken('BIT_RIGHT', /^>{2}(?!=)/, prec.BITSHIFT, assoc.LEFT, args.BOTH),
  new OpToken('NEQ', /^!=/, prec.EQ_N_NEQ, assoc.LEFT, args.BOTH),
  new OpToken('EQ', /^={2}/, prec.EQ_N_NEQ, assoc.LEFT, args.BOTH),
  new OpToken('GT_EQ', /^>=/, prec.LT_N_GT, assoc.LEFT, args.BOTH),
  new OpToken('LT_EQ', /^<=/, prec.LT_N_GT, assoc.LEFT, args.BOTH),

  new TempToken('ANGLE_LEFT', /^</, [
    new OpToken('LT', false, prec.LT_N_GT, assoc.LEFT, args.BOTH),
    new Token('GEN_LEFT', type.SEP)
  ]),

  new TempToken('ANGLE_RIGHT', /^>/, [
    new OpToken('GT', false, prec.LT_N_GT, assoc.LEFT, args.BOTH),
    new Token('GEN_RIGHT', type.SEP)
  ]),

  // Idea: leave out left or right values for getting an infinite iterator, invocable as a coroutine.
  // Lazy evaluation may make this easier, too.
  new TempToken('DOT_DOT', /^\.{2}/, [
    new OpToken('RANGE_FULL', false, prec.RANGE, assoc.LEFT, args.BOTH),
    new OpToken('RANGE_INF', false, prec.RANGE, assoc.LEFT, args.LEFT),
    new OpToken('RANGE_NEG_INF', false, prec.RANGE, assoc.LEFT, args.RIGHT)
  ]),

  new TempToken('AT', /^\?./, [
    new OpToken('REF', false, prec.POST_N_ACCESS, assoc.LEFT, args.LEFT),
    new OpToken('DEREF', false, prec.PRE_N_NOT, assoc.RIGHT, args.RIGHT)
  ]),

  new OpToken('MAYBE_ACCESS', /^\?./, prec.POST_N_ACCESS, assoc.LEFT, args.BOTH),
  new OpToken('ACCESS', /^\./, prec.POST_N_ACCESS, assoc.LEFT, args.BOTH),
  new OpToken('MAYBE', /^\?/, prec.POST_N_ACCESS, assoc.LEFT, args.BOTH),
  new OpToken('CAST', /^:{2}/, prec.POST_N_ACCESS, assoc.LEFT, args.BOTH),
  new OpToken('EACH', /^:/, prec.EACH, assoc.RIGHT, args.BOTH),

  new Token('BLOCK_O', type.SEP, /^{/),
  new Token('BLOCK_C', type.SEP, /^}/),
  new Token('TUPLE_O', type.SEP, /^\(/),
  new Token('TUPLE_C', type.SEP, /^\)/),
  new Token('LIST_O', type.SEP, /^\[/),
  new Token('LIST_C', type.SEP, /^]/),
  new Token('ARG_DEMARK', type.SEP, /^,/),
  new Token('EXP_DEMARK', type.SEP, /^;+/),
  new Token('SEP_EOF', type.SEP, /^\0/),

  new Token('IDENTIFIER', type.IDENT, /^[a-zA-Z_$][\w$]*/),

  // Misc reserved characters, temporary { r: /^[=?:()[\]{}<>@#]/ },

  // Errors
  new Token('STR_NOESC', type.LIT, findUnexpectedEOF('^""".*?', '"""', 'STR_NOESC')),
  new Token('STR', type.LIT, findUnexpectedEOF('^".*?(?<!\\\\)(?:\\\\\\\\)*', '"', 'STR')),
  new Token('CHAR', type.LIT, findUnexpectedEOF('^\'.*?(?<!\\\\)(?:\\\\\\\\)*', '\'', 'CHAR')),
  new Token('UNKNOWN', type.INVALID, new Error('Unknown token'))
]

function matchNestedBlockComment (str, override = false) {
  if (/^\/\*/.test(str) || override) {
    const matchOpen = str.slice(2).match(/\/\*/)
    const matchClose = str.slice(2).match(/\*\//)

    if (!matchClose) return str
    if (!matchOpen || matchClose.index < matchOpen.index) return str.slice(0, matchClose.index + 4)
    const matchRecursive = matchNestedBlockComment(str.slice(matchOpen.index + 2))
    const len = matchOpen.index + matchRecursive.length + 4
    return str.slice(0, len) + matchNestedBlockComment(str.slice(len), true)
  }
}

function findUnexpectedEOF (regex, delimiter, name) {
  const mustNotMatch = new RegExp(regex + delimiter, 's')
  const mustMatch = new RegExp(regex + '\\0', 's')
  return (str) => {
    if (mustMatch.test(str) && !mustNotMatch.test(str)) return new Error(`Unexpected EOF in ${name}`)
  }
}

module.exports = tokenList
