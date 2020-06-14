class Token {
  constructor (type, row, col, symbol = type) {
    this.type = type
    this.row = row
    this.col = col
    this.symbol = symbol
  }
}

module.exports = Token
