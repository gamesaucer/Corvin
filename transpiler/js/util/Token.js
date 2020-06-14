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

module.exports = Token
