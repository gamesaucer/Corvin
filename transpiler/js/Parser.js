module.exports = { parse }

const out = require('./Console')
const { argDelimiter, expDelimiter, blockTokens } = require('./util/TokenList')
const tokenTypes = require('./util/TokenTypes')
const tokenPrecedences = require('./util/TokenPrecedences')

class ParseNode {
  constructor (type, content) {
    this.type = type
    this.content = content
  }
}

var file

// function parse (tokenList, fileName, fileContents) {
/* file = fileName
  str = fileContents
  var pos = 0
  while (!tokenList.every(t => t instanceof ASTNode)) {
    const node = getNextNode(tokenList.slice(pos))
    tokenList.splice(pos++, node.getLength(), node)
  }
  const node = getASTNode('expression')
  node.setChildren(tokenList)
  return node */
// }

/* function getASTNode (name) {
  return new ASTNode(name)
}

function getASTLeaf (name) {
  return new ASTLeaf(name)
} */

function parse (tokens, fileName) {
  file = fileName

  collapseBlocks(tokens)
  collapseDelimiters(tokens, argDelimiter, [undefined, ...blockTokens[0].filter(t => t.name === 'BLOCK_O')])
  collapseDelimiters(tokens, expDelimiter)
  resolveTempTokens(tokens)
  collapseOperators(tokens)

  return tokens
}

/**
 * Reduce an expression to only binary and unary subexpressions.
 * @param {*} tokens
 */
function collapseOperators (tokens) {
  tokens
    .filter(t => t instanceof ParseNode)
    .forEach(node => collapseOperators(node.content))

  tokenPrecedences.forEach(p => {
    // const reduceAssoc = p[0] === -1 ? reduce, reduceRight
    if (p[0] === -1) {
      for (let i = 0; i < tokens.length; i++) collapseSingleOperator(tokens, i, p)
    } else {
      for (let i = tokens.length - 1; i >= 0; i--) collapseSingleOperator(tokens, i, p)
    }
  })
}

/**
 * Create a tree node from a single operator.
 * @param {*} tokens
 * @param {*} index
 */
function collapseSingleOperator (tokens, i, precedence) {
  const token = tokens[i]
  if (token.precedence === precedence) return

  const start = Math.min(0, ...token.argPlaces)
  const end = Math.max(0, ...token.argPlaces)
  tokens.splice(
    i + start,
    end - start + 1,
    new ParseNode(token, token.argPlaces.map(aP => tokens[i + aP]))
  )
}

/**
 * Resolves context of ambiguous tokens.
 * @param {*} tokens
 */
function resolveTempTokens (tokens) {
  tokens
    .filter(t => t instanceof ParseNode)
    .forEach(node => resolveTempTokens(node.content))

  const tempTokens = tokens
    .filter(t => t.type === tokenTypes.TEMP)
    .flatMap((t, i) => t.tokenOptions.map(opt => ({ t: opt, i })))
    .sort((a, b) =>
      (tokenPrecedences.findIndex(v => v === a.t.precedence) + 1 || 100) -
      (tokenPrecedences.findIndex(v => v === b.t.precedence) + 1 || 100))

  for (var j = 0; j < tempTokens.length; j++) {
    if (tokens[tempTokens[j].i].type === tokenTypes.TEMP) {
      if (tempTokens[j].t.argPlaces.every(side => {
        const arg = tokens[j + side]
        if (arg === undefined) return false
        if ([tokenTypes.IDENT, tokenTypes.LIT].includes(arg.type)) return true
        if (arg.type === tokenTypes.OP) return !arg.argPlaces.includes(-side)
        return true
      })) {
        tempTokens[j].t.occurrence = tokens[tempTokens[j].i].occurrence
        tokens[tempTokens[j].i] = tempTokens[j].t
      }
    }
  }

  tokens
    .filter(t => t.type === tokenTypes.TEMP)
    .forEach(t => {
      // Failed to convert some tokens.
      out.print.error([`Unexpected ${t.name}`],
        [{
          row: t.occurrence.location.line,
          col: t.occurrence.location.col,
          file,
          name: t.name
        }],
        t.occurrence.location.neighbourhood
      )
      process.exit(1)
    })
}

/**
 * Splits nodes by delimiter
 * @param {*} tokens
 * @param {*} type
 */
function collapseDelimiters (tokens, type, disallowed = [], parentNode) {
  // If delimiters aren't allowed here but are present, error
  {
    const i = tokens.findIndex(t => t.name === type.name)
    if (disallowed.includes(parentNode) && i !== -1) throwDisallowedDelimiterError(parentNode, tokens[i])
  }

  // Take care of children first, since the tree is simplest at this stage.
  tokens
    .filter(t => t instanceof ParseNode)
    .forEach(node => collapseDelimiters(node.content, type, disallowed, node.type))

  const delimiters = [-1, ...tokens
    .map((t, i) => ({ t, i }))
    .filter(o => o.t.name === type.name)
    .map(o => o.i)]

  delimiters
    .map((d, i, a) => new ParseNode(type, tokens.slice(d + 1, a[i] || tokens.length)))
    .forEach((a, i) => {
      tokens.splice(i, a.length + 1, ...a)
    })
}

/**
 * Handles errors involving commas in wrong places
 * @param {*} parentNode
 * @param {*} badNode
 */
function throwDisallowedDelimiterError (parentNode, badNode) {
  out.print.error([`Unexpected ${badNode.name} in expression of type ${parentNode.name}`],
    [{
      row: badNode.occurrence.location.line,
      col: badNode.occurrence.location.col,
      file,
      name: badNode.name
    }],
    badNode.occurrence.location.neighbourhood
  )
  process.exit(1)
}

/**
 * Creates a basic tree with nested blocks
 * @param {*} tokens
 * @param {*} currentBlock
 */
function collapseBlocks (tokens, currentBlock = -1) {
  const openNextBlock = blockTokens[0].reduce((acc, cur) => {
    const index = tokens.findIndex(v => v.name === cur.name)
    return (index === -1 || acc < index) && acc !== -1 ? acc : index
  }, -1)
  const closeCurrentBlock = blockTokens[1].reduce((acc, cur) => {
    const index = tokens.findIndex(v => v.name === cur.name)
    return (index === -1 || acc < index) && acc !== -1 ? acc : index
  }, -1)

  if (openNextBlock === -1 || closeCurrentBlock < openNextBlock) {
    if (tokens[closeCurrentBlock].name !== blockTokens[1][currentBlock].name) {
      // Wrong closing token
      throwBlockTokenError(tokens[closeCurrentBlock], blockTokens[1][closeCurrentBlock] || { name: 'EOF' })
    } else {
      // Close current block
      return tokens.splice(0, closeCurrentBlock)
    }
  } else if (closeCurrentBlock === -1 || openNextBlock < closeCurrentBlock) {
    // Open new block
    const subList = tokens.splice(openNextBlock + 1)
    const nextList = collapseBlocks(subList, blockTokens[0].findIndex(t =>
      tokens[openNextBlock].name === t.name
    ))
    subList.shift()
    tokens.splice(openNextBlock, 1, new ParseNode(tokens[openNextBlock], nextList), ...subList)
    return collapseBlocks(tokens, currentBlock)
  } else if (currentBlock !== -1) {
    // Code ends without block closed.
    throwBlockTokenError(tokens[tokens.length - 1], blockTokens[1][closeCurrentBlock])
  } else {
    // End of code; chop off EOF token.
    tokens.splice(tokens.length - 1)
  }
}

/**
 * Handles errors such as unclosed blocks or unexpected closing tokens.
 * @param {*} unexpectedToken
 * @param {*} expectedToken
 */
function throwBlockTokenError (unexpectedToken, expectedToken) {
  out.print.error([
    `Unexpected ${unexpectedToken.name};`,
    `The appropriate token for closing the current block is ${expectedToken.name}`
  ], [{
    row: unexpectedToken.occurrence.location.line,
    col: unexpectedToken.occurrence.location.col,
    file,
    name: unexpectedToken.name
  }],
  unexpectedToken.occurrence.location.neighbourhood
  )
  process.exit(1)
}
/* const open = tokenList.findIndex(v => v.type === openToken.type)
  const close = tokenList.findIndex(v => v.type === closeToken.type)

  if (open === -1 || close < open) {
    collapseBlocks(tokenList.slice(close) + 1, openToken, closeToken)
  } else if (close === -1 || open < close) {

  } */

/* if (open !== -1) {
    const close = findClosingToken(tokenList.slice(open) + 1, closeToken)
  } */

/* function getExpr (tokenList) {
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
} *

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

  /*

  Okay, quick revelation. I'm doing this ENTIRELY the wrong way.
  I need to start unflattening by token groups. First, blocks. Then separators.
  After that, operators, grouped by precedence, and reducing according to their associativity.
  I need to think on how to do variable declarations, but that aside everything should work pretty
  well.

  Actually, if a variable declaration takes ANS as its type, the type can be a separate expression.
  Shouldn't give any problems that way. That should be decently elegant as a solution.

  *

  // Two literals right at the start of an expression are invalid
  // TODO: Make literals and idents following each other invalid; they're separate expressions.
  // So: "fn 10" will be split into "fn" and "10". These expressions are later grouped together.
  // An exceptions is two identifiers, which are a type and a variable name.
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
