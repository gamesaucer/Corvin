
const type = require('./TokenTypes')
const prec = require('./TokenPrecedences')
const { Token, OpToken, TempToken } = require('./Token')

const assoc = {
  LEFT: -1,
  RIGHT: 1
}

const args = {
  LEFT: [-1],
  BOTH: [-1, 1],
  RIGHT: [1]
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
  new Token('EOF', type.SEP, /^\0/),

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

module.exports = { tokenList }
