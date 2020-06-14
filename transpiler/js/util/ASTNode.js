class ASTNode {
  constructor (name) {
    this.name = name
    this.children = []
  }

  getLength () {
    this.children.reduce((acc, cur) => cur.getLength() + acc, 0)
  }
}

module.exports = ASTNode
