class ASTLeaf {
  constructor (name) {
    this.name = name
  }

  getLength () {
    return 1
  }
}

module.exports = ASTLeaf
