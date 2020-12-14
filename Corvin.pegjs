/**
 * Corvin grammar (WIP)
 *
 * Used as a prototyping tool for designing Corvin.
 * No features are currently final.
 * More info here later.
 *
 * Currently supported features:
 *
 *   - Line comments and nested block comments.
 *
 *       Nesting block comments is superior in two ways.
 *       Firstly, if a block comment is accidentally opened, it's not
 *       accidentally closed by an existing block comment after it. This means
 *       that mistakes are far less likely to result in a valid but incorrect
 *       program.
 *       Secondly, if you ever wanted to comment out code that contains a block
 *       comment already, you know how much of a pain it is, since the existing
 *       block comment interferes with the block comment you're trying to create
 *       in languages without nested block comments.
 *
 *   - Automatic semicolon insertion at the end of a block and EOF.
 *
 *       Corvin is able to detect many missing semicolon instances, but chooses
 *       to reject most of these instances as incorrect programs, to avoid
 *       a habit of omitting semicolons potentially leading to ambiguous statements
 *       where two lines of code that are intended to be separate would interact.
 *
 *   - Identifiers are supported.
 *
 *       Identifiers must start with a letter, underscore or currency symbol, and
 *       can contain numbers, connectors and combining marks afterwards.
 *
 *   - String literals using single or double quotes.
 *   - String literals without escapes using triple double quotes.
 *   - Numeric literals can be specified in base 2, 8, 10 and 16.
 *
 *       Non-decimal numbers use the (case-insensitive) prefixes 0b, 0o and 0x.
 *
 *   - Decimal numeric literals can make use of a fractional component and/or exponents.
 *   - Rudimentary error / warning logging that doesn't halt the parser.
 *
 *       If the program is rejected, only logs will be produced.
 *       Some errors still halt the parser, but my intention is to eliminate this
 *       possibility as much as possible, to allow the parser to catch as many issues
 *       in a single pass as possible, so as not to waste the programmer's time
 *       correcting issues one at a time and having to parse the program again in
 *       between.
 *
 *   - Code blocks are supported.
 *   - If and if/else expressions are supported.
 *
 *       Corvin has no ternary, since if/else expressions are fully equivalent.
 *
 *   - Do, do-while, do-until, while and until loops are supported.
 *
 *       Do-while and do-until loops allow the condition to come either before or
 *       after the block.
 *       Do-loops are loops without a condition, and thus must be broken out of.
 *       The difference between the while and until keywords is simply that "while"
 *       repeats the loop while the condition is true, whereas "until" repeats it
 *       while the condition is false.
 *       There is no particular inherent reason to support both expressions of
 *       this loop condition, but it may help programmers to more clearly get
 *       across their intention. For example, try replacing the names of the
 *       exit conditions in the following examples with more generic names, and
 *       consider which of these three equivalent statements is the clearest:
 *
 *         until (exitCondition1 || exitCondition2) doSomething();
 *         while (!exitCondition1 && !exitCondition2) doSomething();
 *         while (!(exitCondition1 || exitCondition2)) doSomething();
 *
 *   - Many basic operators are supported and obey precedence and associativity rules:
 *
 *       Unary: + - / ~ ! ++ -- 
 *       Binary: ** * / % + - >> << >= > <= < == != & ^ | && ^^ ||
 *       Assignment: **= *= /= %= += -= >>= <<= ^= |= &= =
 *
 * Corvin © 2019-2020 @gamesaucer 
 */



/************************
 *                      *
 *    JS Initialiser    *
 *                      *
 ************************/



{
  /**
   * Constants
   */

  const logs = {}
  const LEVEL = { ERR: 0, WARN: 1, NOTE: 2 }
  const OUTPUT = { 0:console.error, 1:console.warn, 2:console.log }
  const MSG = {
    INVALIDNUM: 'Invalid numeric literal found',
    STRUNCLOSED: 'Unterminated string literal found',
    UNEXPIDENT: 'Unexpected identifier "%0"',
    UNEXPNUM: 'Unexpected digit "%0"',
    MISSINGEOS: 'Missing semicolon',

    // Detail
    EXPERR: 'Malformed exponent',
    RADIXTOKENERR: 'Radix token "%0" not allowed by itself',
    FRACTOKENERR: 'Fraction token "%0" not allowed by itself',
  }



  /**
   * Parser output
   */

  function processParserOutput(program) {
    printLogs()
    if (logs[LEVEL.ERR]) {
      return { logs }
    } else {
      return { program, logs }
    }
  }



  /**
   * Utility functions
   */

  function extractList (list, index) {
    return list.map(o => o[index])
  }

  function buildListFromHeadTail (head, tail, index) {
    return [head].concat(extractList(tail, index))
  }

  /**
   * Makes sure that the provided value is an array by providing an empty array if it is not.
   * @param {?Array} value - the array to guarantee
   * @returns {Array} either the value or an empty array
   */
  function listQmToList (value) {
    return value instanceof Array ? value : []
  }

  /**
   * Trims down the information in the standard location object to only the necessary parts.
   * @returns {object} - location object with line and column properties
   */
  function getLocation () {
    const {line, column} = location().start
    return { line, column }
  }

  /**
   * When given a single character and a string consisting of Unicode category identifiers,
   * this function checks whether the character belongs to one of those categories.
   * @param {string} char - the character to check
   * @param {string} categories - the categories to check for
   * @returns {boolean} - whether the character is in one of the provided categories
   */
  function matchUnicodeCharacterCategories (char, categories) {
    return categories
      .split(/(?=[A-Z])/)
      .some(category => char.match(new RegExp(`\\p{${category}}`,'u')))
  }

  /**
   * Inserts values into a template string and returns the string.
   * Any occurrence of a % followed by a number is replaced by that index in the array of values.
   * These occurrences cannot be escaped as this is only a rudimentary implementation.
   * @param {string} string - the template string
   * @param {Array} vars - the values to insert
   * @returns {string} the template string with the values inserted
   */
  function sprintf (string, ...vars) {
    return string.replace(/%([0-9]+)/g, (_, n) => vars[n])
  }

  /**
   * Converts a string to titlecase (first letter is uppercase, the rest lowercase)
   * @param {?string} string - the string to titlecase
   * @returns {string} the titlecased string
   */
  function titleCase (string) {
    return string?.replace(/^(.)(.*)/, (_, u, l) => u.toUpperCase() + l.toLowerCase()) || ''
  }



  /**
   * Logging
   */

  function log (type, ...message) {
    if (!logs[type]) logs[type] = []
    logs[type].push({message: message.join(' - '), location: getLocation()})
  }

  function printLogs () {
    for (const level in logs) {
      logs[level].forEach(log => {
        OUTPUT[level](log.message, `\n\ton line ${log.location.line} at position ${log.location.column}`)
      })
    }
  }



  /**
   * Expression builders
   */

  function buildUnaryExpression (name, head, tail) {
    return tail.reduce((result, element) => ({
      type: name + 'Expression',
      operator: element[1],
      prefix: !head,
      argument: result || element[3],
      //location: getLocation(),
    }), head)
  }

  function buildBinaryExpression (name, head, tail) {
    return tail.reduce((result, element) => ({
      type: name + 'Expression',
      operator: element[1],
      left: result,
      right: element[3],
      //location: getLocation(),
    }), head)
  }

  function buildValue(type, value, returns) {
    return { type, value, returns, /*location: getLocation()*/ }
  }

  // Best run this only on a second pass, when identifiers can be more easily decoded.
  function setExpressionReturnType (expression) {
    // TODO implement
    return expression
  }



  /**
   * String validation
   */

  function isStringClosed(openQuote, closeQuote) {
    if (closeQuote) { 
      return openQuote === closeQuote 
    } else { 
      log(LEVEL.ERR, MSG.STRUNCLOSED); 
      return true; 
    }
  }
}




/*********************
 *                   *
 *    PEG Grammar    *
 *                   *
 *********************/



Start = _ program:Program _ { return processParserOutput(program) }



/**
 * Program
 */

Program
  = body:SourceElementList? { return buildValue('Program', listQmToList(body)) }

SourceElementList
  = head:SourceElement tail:(_ SourceElement)* {
      return buildListFromHeadTail(head, tail, 1)
    }

SourceElement = _ statement:Statement _ { return statement }



/**
 * Statements
 */

Statement
  = DeclarationStatement
  / ExpressionStatement
  / EmptyStatement

ExpressionStatement = expr:Expression _ EOS { return expr }
EmptyStatement = EOSToken { return buildValue('EmptyExpression', null, 'None') }
DeclarationStatement
  = type:Expression _ ident:Identifier tail:AssignmentExpressionTail+ _ EOS
    { return { type:'DeclarationExpression', left:type, right:buildBinaryExpression('Assignment', ident, tail) } }
  / type:Expression _ ident:Identifier _ EOS { return { type:'DeclarationExpression', left:type, right:ident } }




// Automatic Semicolon Insertion

EOS
  = _ EOSToken
  / _ &(CloseBlockToken / SequenceToken)
  / _ EOF
  / _ { log(LEVEL.ERR, MSG.MISSINGEOS) }

EOF = !.



/**
 * Expressions
 */

PrimaryExpression
  = BracketedExpression
  / KeywordExpression
  / Identifier
  / Literal
  / Block

Block
  = OpenBlockToken _ body:SourceElementList? _ CloseBlockToken { return buildValue('Block', listQmToList(body)) }

BracketedExpression
  = OpenTupleToken _ expr:Expression _ CloseTupleToken { return expr }



// Keyword expressions

ConditionalExpression
  = IfKeyword _ test:(Block / Expression) _
    consequent:(Block / Expression) _ ElseKeyword _
    alternate:(Block / Expression)
    { return { type:'Conditional', test, consequent, alternate } }
  / IfKeyword _ test:(Block / Expression) _
    consequent:(Block / Expression)
    { return { type:'Conditional', test, consequent, alternate:[] } }

DoExpression
  = defer:DoKeyword? _ condition:WhileExpression _ consequent:(Block / Expression) {
      return { 
        type: titleCase(defer) + titleCase(condition.type) + 'Loop',
        test: condition.test,
        consequent 
      }
    }
  / DoKeyword _ consequent:(Block / Expression) _ condition:WhileExpression? {
    return { 
      type:'Do' + titleCase(condition?.type) + 'Loop',
      test: condition?.test || true,
      consequent
    }
  }

WhileExpression
  = type:(WhileKeyword / UntilKeyword) _ test:(Block / Expression) { return {type, test} }

KeywordExpression 
  = ConditionalExpression
  / DoExpression



// Operators

/* Update expressions are non-associative */
UpdateExpression
  = head:PrimaryExpression
    tail:(_ $UpdateOperator)?
    { return buildUnaryExpression('Update', head, tail ? [tail] : []) }
  / tail:(_ $UpdateOperator _ PrimaryExpression)
    { return buildUnaryExpression('Update', undefined , [tail]) }

/* Prefix expressions are right-associative */
PrefixExpression
  = UpdateExpression
  / tail:(_ $PrefixOperator _ PrefixExpression)+
    { return buildUnaryExpression('Prefix', undefined , tail) }

/* Exponentiation expressions are right-associative */
ExponentiationExpression
  = head:PrefixExpression
    tail:(_ $ExponentiationOperator _ ExponentiationExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Multiplicative expressions are left-associative */
MultiplicativeExpression
  = head:ExponentiationExpression
    tail:(_ $MultiplicativeOperator _ ExponentiationExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Additive expressions are left-associative */
AdditiveExpression
  = head:MultiplicativeExpression
    tail:(_ $AdditiveOperator _ MultiplicativeExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Bitshift expressions are left-associative */
BitshiftExpression
  = head:AdditiveExpression
    tail:(_ $BitshiftOperator _ AdditiveExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Relational expressions are left-associative */
RelationalExpression
  = head:BitshiftExpression
    tail:(_ $RelationalOperator _ BitshiftExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Equality expressions are left-associative */
EqualityExpression
  = head:RelationalExpression
    tail:(_ $EqualityOperator _ RelationalExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Bitwise AND expressions are left-associative */
BitwiseAndExpression
  = head:EqualityExpression
    tail:(_ $BitwiseAndOperator _ EqualityExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Bitwise XOR expressions are left-associative */
BitwiseXorExpression
  = head:BitwiseAndExpression
    tail:(_ $BitwiseXorOperator _ BitwiseAndExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Bitwise OR expressions are left-associative */
BitwiseOrExpression
  = head:BitwiseXorExpression
    tail:(_ $BitwiseOrOperator _ BitwiseXorExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Logical AND expressions are left-associative */
LogicalAndExpression
  = head:BitwiseOrExpression
    tail:(_ $LogicalAndOperator _ BitwiseOrExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Logical XOR expressions are left-associative */
LogicalXorExpression
  = head:LogicalAndExpression
    tail:(_ $LogicalXorOperator _ LogicalAndExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Logical OR expressions are left-associative */
LogicalOrExpression
  = head:LogicalXorExpression
    tail:(_ $LogicalOrOperator _ LogicalXorExpression)*
    { return buildBinaryExpression('Binary', head, tail) }

/* Assignment expressions are right-associative */
AssignmentExpression
  = head:LogicalOrExpression
    tail:AssignmentExpressionTail*
    { return buildBinaryExpression('Assignment', head, tail) }
AssignmentExpressionTail
  = _ $AssignmentOperator _ AssignmentExpression

Expression = AssignmentExpression



/**
 * Literals
 */

Literal = NumericLiteral / StringLiteral



// Number

/* Numeric literals are expressed in base 2, 8, 10 or 16. */
NumericLiteral 'number'
  = val:(BinLiteral / OctLiteral / HexLiteral / DecLiteral) 
    &(t:$IdentifierName &{log(LEVEL.ERR, sprintf(MSG.UNEXPIDENT, t))})?
    &(t:$DecDigitToken &{log(LEVEL.ERR, sprintf(MSG.UNEXPNUM, t))})?
    { return buildValue('NumericLiteral', val, 'Number') }

/* A literal of any base that's not 10 is preceded by a special token. Base 10 can be an int or a real, and may have an exponent.*/
BinLiteral = t:BinLiteralToken val:$BinDigitToken* 
  &{ if (val.length === 0) log(LEVEL.ERR, MSG.INVALIDNUM, sprintf(MSG.RADIXTOKENERR, t) ); return true }
  { return parseInt(val, 2) }
OctLiteral = t:OctLiteralToken val:$OctDigitToken* 
  &{ if (val.length === 0) log(LEVEL.ERR, MSG.INVALIDNUM, sprintf(MSG.RADIXTOKENERR, t) ); return true }
  { return parseInt(val, 8) }
DecLiteral = val:(RealLiteral / IntegerLiteral) e:ExponentLiteral? { return val*10**e }
HexLiteral = t:HexLiteralToken val:$HexDigitToken*
  &{ if (val.length === 0) log(LEVEL.ERR, MSG.INVALIDNUM, sprintf(MSG.RADIXTOKENERR, t) ); return true }
  { return parseInt(val, 16) }

/* An exponent consists of a special token followed by an optional sign and a required set of decimal digits */
ExponentLiteral = ExponentToken val:$(SignToken? DecDigitToken*)
  &{ if (isNaN(parseInt(val, 10))) log(LEVEL.ERR, MSG.INVALIDNUM, MSG.EXPERR); return true }
  { return parseInt(val, 10) }

/* A decimal integer consists of a set of decimal digits */
IntegerLiteral = val:$DecDigitToken+ { return parseInt(val, 10) }

/* A decimal real consists of one or more decimal digits which are prefixed, postfixed or infixed with a special token */
RealLiteral
  = int:$DecDigitToken* t:DecimalPointToken frac:$DecDigitToken*
    &{ if (int.length + frac.length === 0) log(LEVEL.ERR, MSG.INVALIDNUM, sprintf(MSG.FRACTOKENERR, t) ); return true }
    { return parseFloat(`${int}.${frac}`, 10) }



// String

/* A string literal consists of opening and closing quotes. If triple double quotes are used, characters aren't escaped.*/
StringLiteral
  = l:DDDQToken
    value:( !(DDDQToken) SourceCharacter)* 
    r:DDDQToken? &{ return isStringClosed(l, r) }
    { return buildValue('StringLiteral', value.flat().join(''), 'String') }
  / l:(SQToken / DQToken) 
    value:( !(t:(SQToken / DQToken)  &{ return l === t } / EscapeToken) SourceCharacter / EscapeSequence)* 
    r:(SQToken / DQToken)? &{ return isStringClosed(l, r) }
    { return buildValue('StringLiteral', value.flat().join(''), 'String') }

// TODO: Template strings
EscapeSequence = EscapeToken char:(EscapeCharacter / SourceCharacter) { return char }
EscapeCharacter
  = "'"
  / '"'
  / "\\"
  / "0"  { return "\0"; }
  / "b"  { return "\b"; }
  / "f"  { return "\f"; }
  / "n"  { return "\n"; }
  / "r"  { return "\r"; }
  / "t"  { return "\t"; }
  / "v"  { return "\v"; }
  / "u" xxxx:$(HexDigitToken HexDigitToken HexDigitToken HexDigitToken) { return String.fromCharCode(parseInt(xxxx, 16)) }
  / LineTerminatorSequence WhiteSpace* { return ""; }



/**
 * Tokens
 */

// Misc

StringToken = DDDQToken / DQToken / SQToken
DQToken = '"'
DDDQToken = '"""'
SQToken = "'"
EscapeToken = '\\'

OpenBlockToken = '{'
CloseBlockToken = '}'
OpenTupleToken = '('
CloseTupleToken = ')'

LineCommentToken = '//'
OpenBlockCommentToken = '/*'
CloseBlockCommentToken = '*/'

BinLiteralToken = '0b' / '0B'
OctLiteralToken = '0o' / '0O'
HexLiteralToken = '0x' / '0X'
ExponentToken = 'e'
SignToken = [+-]

BinDigitToken = [01]
OctDigitToken = [0-7]
DecDigitToken = [0-9]
HexDigitToken = [0-9a-fA-F]
DecimalPointToken = '.'

SequenceToken = ','
EOSToken = ';'



// Keywords

Keyword
  = DoKeyword
  / ElseKeyword
  / IfKeyword

DoKeyword = 'do'
ElseKeyword = 'else'
IfKeyword = 'if'
UntilKeyword = 'until'
WhileKeyword = 'while'



// Operators

PrefixOperator = '+'![+=] / '-'![-=] / '/'![=] / '~'![=] / '!' // '/' is the reciprocal
UpdateOperator = '++'![=] / '--'![=]

ExponentiationOperator = '**'![=]
MultiplicativeOperator = '*'![*=] / '/'![=] / '%'![=]
AdditiveOperator = '+'![+=] / '-'![-=]
BitshiftOperator = '>>'![=] / '<<'![=]
RelationalOperator = '>=' / '>' / '<=' / '<'
EqualityOperator = '==' / '!='
BitwiseAndOperator = '&'![=&]
BitwiseXorOperator = '^'![=^]
BitwiseOrOperator = '|'![=|]
LogicalAndOperator = '&&'
LogicalXorOperator = '^^'
LogicalOrOperator = '||'
AssignmentOperator = ( '**' / '*' / '/' / '%' / '+' / '-' / '>>' / '<<' / '^' / '|' / '&')? '='![=]



// Identifier

/* Identifiers may not be keywords and must consist of a valid identifier name */
Identifier 'identifier'
  = !Keyword ident:$IdentifierName { return buildValue('Identifier', ident)}

/* Identifier names must begin with a valid starting character and continue with valid part characters */
IdentifierName
  = IdentifierStart IdentifierPart* 

/* Valid starting characters are letters, currency symbold, and the underscore */
IdentifierStart
  = Letter
  / CurrencySymbol
  / '_'

/* Valid part characters are valid starting characters, combining marks, digits, connectors, and zero-width spacers*/
IdentifierPart
  = IdentifierStart
  / CombiningMark
  / Digit
  / ConnectorPunctuation
  / '\u200C'
  / '\u200D'



// Characters

SourceCharacter = .

WhiteSpace 'whitespace'             = '\t' / '\v' / '\f' / UnicodeSpace
LineTerminator 'line break'         = UnicodeLineTerminator / [\n\r]
LineTerminatorSequence 'line break' = '\r\n' / LineTerminator

UnicodeSpace          = u:SourceCharacter &{ return matchUnicodeCharacterCategories(u, 'Zs') }
UnicodeLineTerminator = u:SourceCharacter &{ return matchUnicodeCharacterCategories(u, 'ZlZp') }
Letter                = u:SourceCharacter &{ return matchUnicodeCharacterCategories(u, 'LNl') }
CombiningMark         = u:SourceCharacter &{ return matchUnicodeCharacterCategories(u, 'McMeMn') }
Digit                 = u:SourceCharacter &{ return matchUnicodeCharacterCategories(u, 'Nd') }
ConnectorPunctuation  = u:SourceCharacter &{ return matchUnicodeCharacterCategories(u, 'Pc') }
CurrencySymbol        = u:SourceCharacter &{ return matchUnicodeCharacterCategories(u, 'Sc') }



// Whitespace & Control

__ = (WhiteSpace / LineTerminator / Comment)+ // Space required
_ = __* // Space allowed



// Comments

Comment 'comment'
  = MultiLineComment / SingleLineComment

SingleLineComment
  = LineCommentToken
    (!LineTerminator SourceCharacter)*

MultiLineComment 
  = OpenBlockCommentToken 
    (!(CloseBlockCommentToken / OpenBlockCommentToken) . / MultiLineComment)* 
    CloseBlockCommentToken
