class Token {
  constructor (type, row, col, symbol = type, length) {
    this.type = type
    this.row = row
    this.col = col
    this.symbol = symbol
    this.length = length || symbol.length
  }
}

module.exports = Token
