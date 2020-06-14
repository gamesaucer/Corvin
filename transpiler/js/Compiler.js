const fs = require('fs')
const path = require('path')
// const out = require('./Console')
const lexer = require('./Lexer')
const parser = require('./Parser')
var js = require('./env.json')['']

module.exports = { compile }

async function compile (inFileList, outFile, env) {
  js = { ...require('./env.json')[env] }
  const result = (await Promise.all(inFileList.map(path => compileFile(path))))

  fs.writeFileSync(outFile, js.start)
  result.forEach(output => fs.appendFileSync(outFile, output))
  fs.appendFileSync(outFile, js.end)
}

async function compileFile (inFile) {
  const fileContents = await fs.promises.readFile(inFile, { encoding: 'utf-8' })
  return createJS(await parseTokens(await lexString(fileContents)), inFile)
}

async function createJS (ast, inFile) {
  // TODO populate a with code from the ast
  const a = [path.parse(inFile).name, 'console.log("foo")']
  return js.function.replace(/%([0-9])/g, (_, n) => a[n] || '')
}

async function lexString (string) { return lexer.lex(string) }
async function parseTokens (tokenList) { return parser.parse(tokenList) }
