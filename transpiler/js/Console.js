const chalk = require('chalk')

module.exports = {
  print: {
    error: printErrorMessage,
    ok: printSuccessMessage,
    info: () => {},
    warn: () => {},
    help: printHelp
  }
}

function printErrorMessage (message = [], trace = [], hint) {
  process.stdout.write(chalk`{red
  ERROR:
    ${message.join('\n    ')}}\n`)
  trace.forEach(o => process.stdout.write(chalk.red(`      at <${o.file}>:${o.name}:${o.row}:${o.col}\n`)))
  if (hint) {
    const loc = [hint.str.slice(Math.max(hint.pos - 10, 0), hint.pos), hint.str.slice(hint.pos, hint.pos + 10)]
    var n
    if ((n = loc[0].lastIndexOf('\n')) !== -1) loc[0] = loc[0].slice(n + 1)
    if ((n = loc[1].indexOf('\n')) !== -1) loc[1] = loc[1].slice(0, n)
    process.stdout.write(chalk`{red
  Near:
    ${loc.join('')}  
    ${'^'.padEnd(loc[1].length, '~').padStart(loc.join('').length, '~')}}`)
  }
}

function printSuccessMessage (message = []) {
  process.stdout.write(chalk`{green
  DONE:
    ${message.join('\n    ')}}\n`)
}

function printHelp () {
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
