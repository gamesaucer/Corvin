
const type = require('./TokenTypes')
const prec = require('./TokenPrecedences')
const { Token, OpToken, TempToken } = require('./Token')

const args = {
  LEFT: [-1],
  BOTH: [-1, 1],
  RIGHT: [1]
}

const openBlocks = [
  new Token('BLOCK_O', type.SEP, /^{/),
  new Token('TUPLE_O', type.SEP, /^\(/),
  new Token('LIST_O', type.SEP, /^\[/)
]

const closeBlocks = [
  new Token('BLOCK_C', type.SEP, /^}/),
  new Token('TUPLE_C', type.SEP, /^\)/),
  new Token('LIST_C', type.SEP, /^]/)
]

const argDelimiter = new Token('ARG_DELIMIT', type.SEP, /^,/)
const expDelimiter = new Token('EXP_DELIMIT', type.SEP, /^;+/)

const tokenList = [
  // Comments should be ignored
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

  new OpToken('ASSIGN', /^=/, prec.ASSIGN, args.BOTH),
  new OpToken('ADD_ASSIGN', /^\+=/, prec.ASSIGN, args.BOTH),
  new OpToken('SUB_ASSIGN', /^-=/, prec.ASSIGN, args.BOTH),
  new OpToken('MUL_ASSIGN', /^\*=/, prec.ASSIGN, args.BOTH),
  new OpToken('DIV_ASSIGN', /^\/=/, prec.ASSIGN, args.BOTH),
  new OpToken('MOD_ASSIGN', /^%=/, prec.ASSIGN, args.BOTH),
  new OpToken('POW_ASSIGN', /^\*{2}=/, prec.ASSIGN, args.BOTH),
  new OpToken('XOR_ASSIGN', /^\^=/, prec.ASSIGN, args.BOTH),
  new OpToken('OR_ASSIGN', /^\|=/, prec.ASSIGN, args.BOTH),
  new OpToken('AND_ASSIGN', /^&=/, prec.ASSIGN, args.BOTH),
  new OpToken('LEFT_ASSIGN', /^<{2}=/, prec.ASSIGN, args.BOTH),
  new OpToken('RIGHT_ASSIGN', /^>{2}=/, prec.ASSIGN, args.BOTH),

  new TempToken('MIN_MIN', /^-{2}/, [
    new OpToken('DEC_POST', true, prec.POST_N_ACCESS, args.LEFT),
    new OpToken('DEC_PRE', true, prec.PRE_N_NOT, args.RIGHT)
  ]),

  new TempToken('PLUS_PLUS', /^\+{2}/, [
    new OpToken('INC_POST', true, prec.POST_N_ACCESS, args.LEFT),
    new OpToken('INC_PRE', true, prec.PRE_N_NOT, args.RIGHT)
  ]),

  /* new TempToken('MIN', /^\s*-(?!=)/, [
    new OpToken('SUB', /^\s+-(?=\s)|^-(?!\s)/, prec.MATH_PLUS,  args.BOTH),
    new OpToken('NEG', /^\s*-(?!\s)/, prec.PRE_N_NOT,  args.RIGHT)
  ]),

  new TempToken('PLUS', /^\s*\+(?!=)/, [
    new OpToken('ADD', /^\s+\+(?=\s)|^\+(?!\s)/, prec.MATH_PLUS,  args.BOTH),
    new OpToken('POS', /^\s*\+(?!\s)/, prec.PRE_N_NOT,  args.RIGHT)
  ]), */

  new OpToken('NEG', /^`(?!=)/, prec.PRE_N_NOT, args.RIGHT),
  new OpToken('SUB', /^-(?!=)/, prec.MATH_PLUS, args.BOTH),
  new OpToken('ADD', /^\+(?!=)/, prec.MATH_PLUS, args.BOTH),

  new OpToken('POW', /^\*{2}(?!=)/, prec.MATH_POW, args.BOTH),
  new OpToken('DIV', /^\/(?!=)/, prec.MATH_MULT, args.BOTH),
  new OpToken('MUL', /^\*(?!=)/, prec.MATH_MULT, args.BOTH),
  new OpToken('MOD', /^%(?!=)/, prec.MATH_MULT, args.BOTH),

  new OpToken('NOT', /^!(?!=)/, prec.PRE_N_NOT, args.RIGHT),
  new OpToken('AND', /^&{2}/, prec.L_AND, args.BOTH),
  new OpToken('OR', /^\|{2}/, prec.L_OR, args.BOTH),
  new OpToken('XOR', /^\^{2}/, prec.L_XOR, args.BOTH),
  new OpToken('BIT_XOR', /^\^(?!=)/, prec.B_XOR, args.BOTH),
  new OpToken('BIT_OR', /^\|(?!=)/, prec.B_OR, args.BOTH),
  new OpToken('BIT_AND', /^&(?!=)/, prec.B_AND, args.BOTH),
  new OpToken('BIT_NOT', /^~/, prec.PRE_N_NOT, args.RIGHT),
  new OpToken('BIT_LEFT', /^<{2}(?!=)/, prec.BITSHIFT, args.BOTH),
  new OpToken('BIT_RIGHT', /^>{2}(?!=)/, prec.BITSHIFT, args.BOTH),
  new OpToken('NEQ', /^!=/, prec.EQ_N_NEQ, args.BOTH),
  new OpToken('EQ', /^={2}/, prec.EQ_N_NEQ, args.BOTH),
  new OpToken('GT_EQ', /^>=/, prec.LT_N_GT, args.BOTH),
  new OpToken('LT_EQ', /^<=/, prec.LT_N_GT, args.BOTH),

  new OpToken('LT', /^</, prec.LT_N_GT, args.BOTH),
  new OpToken('GT', /^>/, prec.LT_N_GT, args.BOTH),
  // Generics are done using square brackets
  // The significant difference between tuples and lists are that lists are a single type.
  // So generics would be List[List[Type]]. Example:
  /*
    [Type A:Int, Type B:String]
      resolves to:
    [[...all Int child types],[...all String child types]]
  */

  /* new TempToken('ANGLE_LEFT', /^</, [

    new Token('TEMPL_O', type.SEP)
  ]),

  new TempToken('ANGLE_RIGHT', /^>/, [/
    new OpToken('GT', true, prec.LT_N_GT,  args.BOTH),
    new Token('TEMPL_C', type.SEP)
  ]), */

  // Idea: leave out left or right values for getting an infinite iterator, invocable as a coroutine.
  // Lazy evaluation may make this easier, too.
  new TempToken('DOT_DOT', /^\.{2}/, [
    new OpToken('RANGE_FULL', true, prec.RANGE, args.BOTH),
    new OpToken('RANGE_INF', true, prec.RANGE, args.LEFT),
    new OpToken('RANGE_NEG_INF', true, prec.RANGE, args.RIGHT)
  ]),

  /* new TempToken('AT', /^\s*@/, [
    new OpToken('REF', /^@/, prec.POST_N_ACCESS,  args.LEFT),
    new OpToken('DEREF', /^\s*@(?!\s)/, prec.PRE_N_NOT,  args.RIGHT)
  ]), */
  new OpToken('REF', /^@\?/, prec.POST_N_ACCESS, args.LEFT),
  new OpToken('DEREF', /^@/, prec.PRE_N_NOT, args.RIGHT),

  new OpToken('MAYBE_ACCESS', /^\?\./, prec.POST_N_ACCESS, args.BOTH),
  new OpToken('ACCESS', /^\./, prec.POST_N_ACCESS, args.BOTH),
  new OpToken('MAYBE', /^\?/, prec.POST_N_ACCESS, args.BOTH),
  new OpToken('CAST', /^:{2}/, prec.POST_N_ACCESS, args.BOTH),
  new OpToken('EACH', /^:/, prec.EACH, args.BOTH),

  ...openBlocks,
  ...closeBlocks,
  argDelimiter,
  expDelimiter,

  // Space-like characters should be ignored
  new Token(null, type.INVALID, /^[\s]+/),

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

module.exports = { tokenList, blockTokens: [openBlocks, closeBlocks], argDelimiter, expDelimiter }
