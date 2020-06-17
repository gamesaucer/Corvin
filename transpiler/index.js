/* eslint-env node */

module.exports = { jsCorvin }

const path = require('path')
const fs = require('fs')
const dir = process.cwd()
const out = require('./js/Console')
const compiler = require('./js/Compiler')

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
    out.print.help()
    process.exit(0)
  }

  if (!argv.o) {
    out.print.error(['The -o/--ouput flag is required!', 'Use --help for information.'])
    process.exit(1)
  } else if (typeof argv.o !== 'string') {
    out.print.error(['The -o/--ouput flag needs an argument!', 'Use --help for information.'])
    process.exit(1)
  }
  if (argv.o.slice(-3) !== '.js') argv.o += '.js'
  if (argv.e && !['node', 'browser'].includes(argv.e)) {
    out.print.error([`The environment '${argv.e}' is not supported!`, "Use 'node' or 'browser'."])
    process.exit(1)
  }

  if (argv.f) {
    const nonexistent = argv.f.filter(f => !fs.existsSync(f))
    if (nonexistent.length) {
      out.print.error(['Couldn\'t locate the following files:', ...nonexistent.map(f => `  '${f}'`), "Use 'node' or 'browser'."])
      process.exit(1)
    }
  } else {
    argv.f = fs.readdirSync(dir).filter(f => fs.statSync(f).isFile()).filter(f => f.slice(-4) === '.cor')
  }
  if (argv.f.length === 0) {
    out.print.error(['Nothing to compile.'])
    process.exit(1)
  }

  if (argv._.length) {
    out.print.error(['The following arguments are malformed:', ...argv._.map(f => `  '${f}'`), 'Use --help for information.'])
    process.exit(1)
  }

  compiler.compile(argv.f, argv.o, argv.e).then(() => {
    out.print.ok(['Parse tree generated successfully!', `See '${argv.o}' for output.`])
  })
}
