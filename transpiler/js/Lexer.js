module.exports = { lex }

const Token = require('./util/Token')
const out = require('./Console')

function lex (str, f) {
  str = str.replace(/\r\n|\r|\n/, '\n') + '\0'

  const tokens = []
  const strCopy = str

  var pos = 0
  var token
  while ((token = getToken(str))) {
    str = str.slice(token.length)
    if (token.type !== null) {
      const s = strCopy.slice(0, pos)
      token.row = (s.match(/\n/g) || []).length + 1
      token.col = pos - (l => l >= 0 ? l + 1 : 0)(s.lastIndexOf('\n'))
      tokens.push(token)
      if (token.symbol instanceof Error) {
        out.print.error([token.symbol.message], [{ row: token.row, col: token.col, file: f, name: token.type }], { str: strCopy, pos })
        process.exit(1)
      }
    }
    pos += token.length
  }
  return tokens
}

function getToken (str) {
  for (const t of types) {
    const match = t.r instanceof RegExp ? str.match(t.r) : arrayify(t.r(str))
    if (match) {
      return new Token(t.n !== undefined ? t.n : match[0], 0, 0, match[1] || match[0], match[1] ? match[0].length : null)
    }
  }
  return false
}

const arrayify = match => match ? [match] : null
const types = [
  // Space-like characters should be ignored (semicolon is in here for now.)
  { n: null, r: /^[\s;]+/ },

  // Comments should be ignored
  { n: null, r: /^\/\/.*/ },
  { n: null, r: matchNestedBlockComment },

  { n: 'LIT_STR_NOESC', r: /^"""(.*?)"""/ },
  { n: 'LIT_STR', r: /^"(.*?(?<!\\)(?:\\\\)*)"/ },

  // TODO: add (?![^]), adding all reserved characters to the character list.
  // This means that a space will be required between numbers and words.
  { n: 'LIT_FRAC', r: /^([0-9]+\.[0-9]*|[0-9]*\.[0-9]+)/ },
  { n: 'LIT_INT', r: /^[0-9]+/ },
  { n: 'LIT_INT', r: /^0x[0-9a-fA-F]+/ },
  { n: 'LIT_INT', r: /^0b[01]+/ },
  { n: 'LIT_INT', r: /^0o[0-8]+/ },

  { n: 'OP_DEC', r: /^-{2}/ },
  { n: 'OP_INC', r: /^\+{2}/ },

  { n: 'OP_POW', r: /^\*{2}(?!=)/ },
  { n: 'OP_SUB', r: /^-(?!=)/ },
  { n: 'OP_ADD', r: /^\+(?!=)/ },
  { n: 'OP_DIV', r: /^\/(?!=)/ },
  { n: 'OP_MUL', r: /^\*(?!=)/ },
  { n: 'OP_MOD', r: /^%(?!=)/ },

  { n: 'OP_NOT', r: /^!(?!=)/ },
  { n: 'OP_AND', r: /^&{2}/ },
  { n: 'OP_OR', r: /^\|{2}/ },
  { n: 'OP_XOR', r: /^\^{2}/ },

  { n: 'OP_BIT_XOR', r: /^\^(?!=)/ },
  { n: 'OP_BIT_OR', r: /^\|(?!=)/ },
  { n: 'OP_BIT_AND', r: /^&(?!=)/ },
  { n: 'OP_BIT_NOT', r: /^~/ },
  { n: 'OP_BIT_LEFT', r: /^<{2}(?!=)/ },
  { n: 'OP_BIT_RIGHT', r: /^>{2}(?!=)/ },

  { n: 'OP_NEQ', r: /^!=/ },
  { n: 'OP_EQ', r: /^={2}/ },
  { n: 'OP_GT_EQ', r: /^>=/ },
  { n: 'OP_LT_EQ', r: /^<=/ },
  { n: 'OP_LT', r: /^</ },
  { n: 'OP_GT', r: /^>/ },

  { n: 'OP_RANGE', r: /^\.{2}/ },

  { n: 'OP_ASSIGN', r: /^=/ },
  { n: 'OP_ADD_ASSIGN', r: /^\+=/ },
  { n: 'OP_SUB_ASSIGN', r: /^-=/ },
  { n: 'OP_MUL_ASSIGN', r: /^\*=/ },
  { n: 'OP_DIV_ASSIGN', r: /^\/=/ },
  { n: 'OP_MOD_ASSIGN', r: /^%=/ },
  { n: 'OP_POW_ASSIGN', r: /^\*{2}=/ },
  { n: 'OP_XOR_ASSIGN', r: /^\^=/ },
  { n: 'OP_OR_ASSIGN', r: /^\|=/ },
  { n: 'OP_AND_ASSIGN', r: /^&=/ },
  { n: 'OP_LEFT_ASSIGN', r: /^<{2}=/ },
  { n: 'OP_RIGHT_ASSIGN', r: /^>{2}=/ },

  { n: 'SEP_BLOCK_O', r: /^{/ },
  { n: 'SEP_BLOCK_C', r: /^}/ },
  { n: 'SEP_TUPLE_O', r: /^\(/ },
  { n: 'SEP_TUPLE_C', r: /^\)/ },
  { n: 'SEP_LIST_O', r: /^\[/ },
  { n: 'SEP_LIST_C', r: /^]/ },
  { n: 'SEP_ARG', r: /^,/ },

  { n: 'OP_MAYBE_ACCESS', r: /^\?./ },
  { n: 'OP_ACCESS', r: /^\./ },
  { n: 'OP_MAYBE', r: /^\?/ },
  { n: 'OP_OF', r: /^:/ },

  { n: 'IDENTIFIER', r: /^[a-zA-Z_$][\w$]*/ },
  { n: 'EOF', r: /^\0/ },

  // Misc reserved characters, temporary { r: /^[=?:()[\]{}<>@#]/ },

  { n: 'LIT_STR', r: findUnexpectedEOF('^".*?(?<!\\\\)(?:\\\\\\\\)*', '"', 'LIT_STR') },
  { n: 'LIT_STR_NOESC', r: findUnexpectedEOF('^""".*?', '"""', 'LIT_STR_NOESC') }
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
