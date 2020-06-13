/* eslint-env node */

module.exports = { jsCorvin }

const path = require('path')
const fs = require('fs')
const dir = process.cwd()
const chalk = require('chalk')

function jsCorvin () {
  const argv = require('yargs')
    .help(false)
    .alias({
      f: 'file',
      o: 'output',
      v: 'verbose',
      e: ['env', 'environment'],
      w: ['warning', 'warnings'],
      h: 'help'
      // force
    })
    .array('f')
    .coerce('f', f => f.map(path.normalize).map(f => path.extname(f) ? f : f + '.cor'))
    .normalize('o')
    .default('e', 'node')
    .argv

  if (argv.help) {
    showHelp()
    process.exit(0)
  }

  if (!argv.o) {
    showError(['The -o/--ouput flag is required!', 'Use --help for information.'])
    process.exit(1)
  } else if (typeof argv.o !== 'string') {
    showError(['The -o/--ouput flag needs an argument!', 'Use --help for information.'])
    process.exit(1)
  }
  if (argv.o.slice(-3) !== '.js') argv.o += '.js'
  if (argv.e && !['node', 'browser'].includes(argv.e)) {
    showError([`The environment '${argv.e}' is not supported!`, "Use 'node' or 'browser'."])
    process.exit(1)
  }

  if (argv.f) {
    const nonexistent = argv.f.filter(f => !fs.existsSync(f))
    if (nonexistent.length) {
      showError(['Couldn\'t locate the following files:', ...nonexistent.map(f => `  '${f}'`), "Use 'node' or 'browser'."])
      process.exit(1)
    }
  } else {
    argv.f = fs.readdirSync(dir).filter(f => fs.statSync(f).isFile()).filter(f => f.slice(-4) === '.cor')
  }
  if (argv.f.length === 0) {
    showError(['Nothing to compile.'])
    process.exit(1)
  }

  if (argv._.length) {
    showError(['The following arguments are malformed:', ...argv._.map(f => `  '${f}'`), 'Use --help for information.'])
    process.exit(1)
  }

  Promise.all(argv.f.map(f => compile(f))).then((c) => {
    const ws = fs.createWriteStream(argv.o)
    c.forEach(c => { ws.write(c); ws.write('\r\n') })
    ws.end()
    process.stdout.write(chalk`{green
  DONE!}\n`)
  })
}

async function compile (file) {
  const fileContents = await fs.promises.readFile(file, { encoding: 'utf-8' })
  return `const ${file.slice(0, -4).replace(/ /g, '_')} = (function(){return'${fileContents.replace(/(?<!\\)((?:\\\\)*)(')/g, '$1\\$2')}'})()`
}

function showWarning () {

}

function showError (err) {
  process.stdout.write(chalk`{red
  ERROR:
    ${err.join('\n    ')}}\n`)
}

function showHelp () {
  process.stdout.write(chalk`
  {yellow -h, --help}
      Prints out instructions for the use of js-corvin.

  {yellow -f, --file}
    {gray path1[, ...[, pathN]]}
      A list of files to be compiled. By default,
      compiles all files in the current folder with the
      .cor extension.

  {yellow -o, --output}
    {gray path}
      The target file. If the file extension is not '.js',
      '.js' will be appended. Required.

  {yellow -e, --env, --environment}
    {gray node|browser}
      The platform to build for.

  {yellow -v, --verbose}
      Provide detailed information about the compilation
      process. Piping this into a log file is recommended.

  {yellow -w, --warning, --warnings}
      Show compiler warnings.
  
  {yellow --version}
      Prints out the version of js-corvin.
`)
}
