module.exports = { lex }

const out = require('./Console')
const { tokenList } = require('./util/TokenList')

function lex (str, f) {
  str = str.replace(/\r\n|\r|\n/, '\n') + '\0'

  const tokens = []
  const strCopy = str

  var pos = 0
  var token
  while ((token = getToken(str))) {
    str = str.slice(token.length)
    if (token.name !== null) {
      token.occurrence.setLocation(pos, strCopy)
      tokens.push(token)
      if (token.symbol instanceof Error) {
        out.print.error(
          [token.symbol.message],
          [{
            row: token.occurrence.location.line,
            col: token.occurrence.location.col,
            file: f,
            name: token.name
          }],
          token.occurrence.location.neighbourhood
        )
        process.exit(1)
      }
    }
    pos += token.length
  }
  return tokens
}

function getToken (str) {
  for (const t of tokenList) {
    const match = t.matchOf(str)
    if (match) return t.setOccurrence(match[1] || match[0] || match, match[1] ? match[0].length : null)
  }
  return false
}
