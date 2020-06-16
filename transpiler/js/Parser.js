module.exports = { parse }

const ASTNode = require('./util/ASTNode')
const ASTLeaf = require('./util/ASTLeaf')
const out = require('./Console')
const tokenTypes = require('./util/TokenTypes')
const tokenPrecedences = require('./util/TokenPrecedences')

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

function getExpr (tokenList) {
  const expression = []
  for (var i = 0; i < tokenList.length; i++) {
    if (isNextTokenValid(expression, tokenList[i])) {
      expression.push(tokenList[i])
    } else {
      while (!isCurrentExpressionValid(expression)) {
        if (expression.pop() === undefined) {
          // TODO Error out; unexpected token encountered.
          process.exit(1)
        }
      }
    }
  }
  resolveTerms(expression)
  return expression
}

function getTerm (tokenList) {}

function getFactor (tokenList) {}

function resolveTerms (expression) {
  const operators = expression
    .map((t, i) => ({ t, i }))
    .filter(o => o.t.type === tokenTypes.OP || o.t.type === tokenTypes.TEMP)

    // Resolve temp-typed tokens.
    .map(o => {
      if (o.t.type !== tokenTypes.TEMP) {
        return o
      } else {
        const bestToken = o.t.tokenOptions
          .sort((a, b) =>
            (tokenPrecedences.findIndex(v => v === a.precedence) + 1 || 100) -
            (tokenPrecedences.findIndex(v => v === b.precedence) + 1 || 100))
          .find(t => t.argPlaces.every(rI =>
            !expression[o.i + rI].argPlaces ||
            !expression[o.i + rI].argPlaces.includes(-rI)
          ))
        bestToken.occurrence = o.t.occurrence
        return bestToken
      }
    })

    // Put operators that take precedence first.
    .sort((a, b) =>
      ((tokenPrecedences.findIndex(v => v === a.t.precedence)) -
      (tokenPrecedences.findIndex(v => v === b.t.precedence)) ||
      b.i * b.t.associativity - a.i * a.t.associativity))

  var shortening = 0
  var litsAndIdents = expression
    .map((t, i) => ({ t, i }))
    .filter(o => o.t.type === tokenTypes.IDENT || o.t.type === tokenTypes.LIT)
    .map(v => v.i)

  for (const op of operators) {
    const range = op.t.argPlaces
      .map(v => litsAndIdents
        .filter(i => (op - i) * v < 0)
        .sort((a, b) => v * (a - b))[0]
      )
    // .reduce((acc, cur) => acc < cur * v ? acc : cur * v), Infinity)
  }
  // TODO continue
}

/* function tryResolveContext (expression, newToken) {
  if (newToken instanceof tokenTypes.TEMP) {
    const a = newToken.tokenOptions.filter(t => isNextTokenValid(expression, t))
    if (a.length === 1) return a[0]
  }
  return newToken
} */

function isNextTokenValid (expression, newToken) {
  const lastToken = expression[expression.length - 1]

  // Expression ends at a separator
  // TODO: create subexpressions. This incorrectly fails on something like 2+(5)
  if (newToken.type === tokenTypes.SEP) return false

  // Expression is invalid if the tokens expect each other as operands.
  if ((
    (lastToken.type === tokenTypes.OP &&
    lastToken.argPlaces.includes(1)) ||
    lastToken === undefined
  ) && (
    newToken instanceof tokenTypes.OP &&
    newToken.argPlaces.includes(-1)
  )) return false

  // Two literals right at the start of an expression are invalid
  if (expression.length === 1 &&
    lastToken.type === tokenTypes.LIT &&
    newToken.type === tokenTypes.LIT
  ) return false

  // If this token requires context, make sure at least some of its options are valid.
  if (newToken instanceof tokenTypes.TEMP) {
    return newToken.tokenOptions.some(t => isNextTokenValid(expression, t))
  }

  return true
}

function isCurrentExpressionValid (expression) {
  const lastToken = expression[expression.length - 1]

  // Dangling operator is invalid.
  if (lastToken.type === tokenTypes.OP &&
    lastToken.argPlaces.includes(1)) return false

  // Check validity of context-sensitive tokens
  const permutations = expression
    .map((t, i) => ({ t, i }))
    .filter(o => o.t.type === tokenTypes.TEMP)
    .reduce((value, tokenObj) => tokenObj.t.tokenOptions
      .map(t => value
        .map(combo => [...t, ...combo])
      )
    , [[]])

  // If there are context-sensitive tokens, check for each permutation.
  if (permutations.length > 1) {
    return permutations
      .some(p => isCurrentExpressionValid(expression
        .map((t, i) => t.type === tokenTypes.TEMP ? p.find(tO => tO.i === i) : t)
      ))
  }
  return true
}

/* function buildExpression (newToken, expression, stack = []) {
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
} */
