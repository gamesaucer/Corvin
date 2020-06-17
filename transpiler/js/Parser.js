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

  toString () {
    return `(${this.type.occurrence.content} ${this.content.map(c => c instanceof ParseNode ? c.toString() : c.occurrence.content)})`
  }
}

var file
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

  Object.values(tokenPrecedences).forEach(p => {
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
  if (token.type !== tokenTypes.OP || token.precedence !== precedence) return

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

  if (delimiters.length > 1) {
    delimiters
      .map((d, i, a) => new ParseNode(type, tokens.slice(d + 1, a[i + 1] || tokens.length)))
      .forEach((a, i) => tokens.splice(i, a.content.length + 1, a))
  }
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

  if ((openNextBlock === -1 && closeCurrentBlock !== -1) || closeCurrentBlock < openNextBlock) {
    if (tokens[closeCurrentBlock].name !== blockTokens[1][currentBlock].name) {
      // Wrong closing token
      throwBlockTokenError(tokens[closeCurrentBlock], blockTokens[1][closeCurrentBlock] || { name: 'EOF' })
    } else {
      // Close current block
      return tokens.splice(0, closeCurrentBlock)
    }
  } else if ((closeCurrentBlock === -1 && openNextBlock !== -1) || openNextBlock < closeCurrentBlock) {
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
