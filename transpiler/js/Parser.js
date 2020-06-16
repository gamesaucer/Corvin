module.exports = { parse }

const ASTNode = require('./util/ASTNode')
const ASTLeaf = require('./util/ASTLeaf')
const out = require('./Console')

class Expr {}
class Term {}
class Factor {}

var file
var str

function parse (tokenList, fileName, fileContents) {
  file = fileName
  str = fileContents
  var pos = 0
  while (!tokenList.every(t => t instanceof ASTNode)) {
    const node = getNextNode(tokenList.slice(pos))
    tokenList.splice(pos++, node.getLength(), node)
  }
  const node = getASTNode('expression')
  node.setChildren(tokenList)
  return node
}

function getASTNode (name) {
  return new ASTNode(name)
}

function getASTLeaf (name) {
  return new ASTLeaf(name)
}

function getNextNode (tokenList, stack = []) {
  var newToken
  var expression = []
  var pos = 0
  while ((newToken = buildExpression(tokenList[pos++], expression, stack))) {

  }
}

function buildExpression (newToken, expression, stack = []) {
  switch (newToken.type) {
    // Literals
    case 'LIT_STR_NOESC':
    case 'LIT_STR':
    case 'LIT_CHAR':
    case 'LIT_FRAC':
    case 'LIT_INT':
      break
    // Take 1 argument, before or after
    case 'OP_DEC':
    case 'OP_INC':
      break
    // Take 1 (after )or 2 arguments
    case 'OP_SUB':
    case 'OP_ADD':
      break
    // Take 2 arguments
    case 'OP_POW':
    case 'OP_DIV':
    case 'OP_MUL':
    case 'OP_MOD':
    case 'OP_AND':
    case 'OP_OR':
    case 'OP_XOR':
    case 'OP_BIT_XOR':
    case 'OP_BIT_OR':
    case 'OP_BIT_AND':
    case 'OP_BIT_LEFT':
    case 'OP_BIT_RIGHT':
    case 'OP_NEQ':
    case 'OP_EQ':
    case 'OP_GT_EQ':
    case 'OP_LT_EQ':
    case 'OP_LT':
    case 'OP_GT':
    case 'OP_RANGE':
    case 'OP_ASSIGN':
    case 'OP_ADD_ASSIGN':
    case 'OP_SUB_ASSIGN':
    case 'OP_MUL_ASSIGN':
    case 'OP_DIV_ASSIGN':
    case 'OP_MOD_ASSIGN':
    case 'OP_POW_ASSIGN':
    case 'OP_XOR_ASSIGN':
    case 'OP_OR_ASSIGN':
    case 'OP_AND_ASSIGN':
    case 'OP_LEFT_ASSIGN':
    case 'OP_RIGHT_ASSIGN':
    case 'OP_MAYBE_ACCESS':
    case 'OP_ACCESS':
    case 'OP_EACH':
      break
    // Take 1 argument after
    case 'OP_NOT':
    case 'OP_BIT_NOT':
      break
    // Take 1 argument before
    case 'OP_MAYBE':
      break
    // Open or close a leaf
    case 'SEP_BLOCK_O':
    case 'SEP_BLOCK_C':
    case 'SEP_TUPLE_O':
    case 'SEP_TUPLE_C':
    case 'SEP_LIST_O':
    case 'SEP_LIST_C':
    case 'SEP_ARG':
      break
    // Other
    case 'IDENTIFIER':
      break
    case 'EOF':
      return stack.length ? getASTLeaf('EOF') : false
    default:
      out.print.error(`Unknown token ${newToken.type}`, [{ row: newToken.row, col: newToken.col, file: file, name: newToken.type }, ...stack], { str: str, pos: newToken.pos })
      process.exit(1)
      break
  }
}

// var prec = 0
/* const operators = {
  // a-- a++ a?.b a.b
  OP_DEC_POST: { assoc: -1, prec },
  OP_INC_POST: { assoc: -1, prec },
  OP_MAYBE_ACCESS: { assoc: -1, prec },
  OP_ACCESS: { assoc: -1, prec: prec++ },

  // --a ++a -a +a !a ~a
  OP_DEC_PRE: { assoc: 1, prec },
  OP_INC_PRE: { assoc: 1, prec },
  OP_NEG: { assoc: 1, prec },
  OP_POS: { assoc: 1, prec },
  OP_NOT: { assoc: 1, prec },
  OP_BIT_NOT: { assoc: 1, prec: prec++ },

  // a?
  OP_MAYBE: { assoc: -1, prec: prec++ },

  // a**b
  OP_POW: { assoc: -1, prec: prec++ },

  // a/b a*b a%b
  OP_DIV: { assoc: -1, prec },
  OP_MUL: { assoc: -1, prec },
  OP_MOD: { assoc: -1, prec: prec++ },

  // a-b a+b
  OP_SUB: { assoc: -1, prec },
  OP_ADD: { assoc: -1, prec: prec++ },

  // a<<b a>>b
  OP_BIT_LEFT: { assoc: -1, prec },
  OP_BIT_RIGHT: { assoc: -1, prec: prec++ },

  // a..b
  OP_RANGE: { assoc: -1, prec: prec++ },

  // a>=b a<=b a>b a<b
  OP_GT_EQ: { assoc: -1, prec },
  OP_LT_EQ: { assoc: -1, prec },
  OP_LT: { assoc: -1, prec },
  OP_GT: { assoc: -1, prec: prec++ },

  // a!=b a==b
  OP_NEQ: { assoc: -1, prec },
  OP_EQ: { assoc: -1, prec: prec++ },

  // a&b
  OP_BIT_AND: { assoc: -1, prec: prec++ },

  // a^b
  OP_BIT_XOR: { assoc: -1, prec: prec++ },

  // a|b
  OP_BIT_OR: { assoc: -1, prec: prec++ },

  // a&&b
  OP_AND: { assoc: -1, prec: prec++ },

  // a^^b
  OP_XOR: { assoc: -1, prec: prec++ },

  // a||b
  OP_OR: { assoc: -1, prec: prec++ },

  // a=b a+=b a-=b a*=b a/=b a%=b a**=b a^=b a|=b a&=b a<<=b a>>=b
  OP_ASSIGN: { assoc: 1, prec },
  OP_ADD_ASSIGN: { assoc: 1, prec },
  OP_SUB_ASSIGN: { assoc: 1, prec },
  OP_MUL_ASSIGN: { assoc: 1, prec },
  OP_DIV_ASSIGN: { assoc: 1, prec },
  OP_MOD_ASSIGN: { assoc: 1, prec },
  OP_POW_ASSIGN: { assoc: 1, prec },
  OP_XOR_ASSIGN: { assoc: 1, prec },
  OP_OR_ASSIGN: { assoc: 1, prec },
  OP_AND_ASSIGN: { assoc: 1, prec },
  OP_LEFT_ASSIGN: { assoc: 1, prec },
  OP_RIGHT_ASSIGN: { assoc: 1, prec: prec++ }

  // TODO below
  // OP_EACH: { assoc: -1, prec }
}

// expr, term, factor

function getExpr (tokenList) {}

function getTerm (tokenList) {}

function getFactor (tokenList) {}
*/
