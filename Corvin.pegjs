/**
 * Corvin grammar (WIP)
 *
 * Used as a prototyping tool for designing Corvin.
 * No features are currently final.
 * More info here later.
 *
 * Currently supported features:
 *
 *   - Line comments and nested block comments
 *   - Automatic semicolon insertion at the end of a block and EOF
 *   - Numeric literals can be specified in base 2, 8, 10 and 16
 *   - Decimal numeric literals can make use of a fractional component and/or exponents
 *   - Identifiers are recognised.
 *   - Many basic operators are recognised and obey precedence and associativity rules:
 *
 *        Unary: + - / ~ ! ++ -- 
 *        Binary: ** * / % + - >> << >= > <= < == != & ^ | && ^^ ||
 *        Assignment: **= *= /= %= += -= >>= <<= ^= |= &= =
 *
 * Corvin © 2019-2020 @gamesaucer 
 */

{
  function extractList (list, index) {
    return list.map(o => o[index])
  }

  function buildListFromHeadTail (head, tail, index) {
    return [head].concat(extractList(tail, index))
  }

  function listQmToList (value) {
    return value !== null ? value : []
  }

  function buildUnaryExpression (name, head, tail) {
    return tail.reduce((result, element) => ({
      type: name + 'Expression',
      operator: element[1],
      prefix: !head,
      argument: result || element[3],
      location: getLocation(),
    }), head)
  }

  function buildBinaryExpression (name, head, tail) {
    return tail.reduce((result, element) => ({
      type: name + 'Expression',
      operator: element[1],
      left: result,
      right: element[3],
      location: getLocation(),
    }), head)
  }

  function buildValue(type, value) {
    return { type, value, location: getLocation() }
  }

  function getLocation() {
    // Temporarily disabled to keep AST clean for debugging the parser
    // return location()
  }

  function matchUnicodeCharacterCategories(char, categories) {
  	console.log(char, categories)
    return categories
      .split(/(?=[A-Z])/)
      .some(category => char.match(new RegExp(`\\p{${category}}`,'u')))
  }
}

Start = _ program:Program _ { return program }



/**
 * Program
 */

Program
  = body:SourceElementList? {
      return {
        type: 'Program',
        body: listQmToList(body)
      };
    }

SourceElementList
  = head:SourceElement tail:(_ SourceElement)* {
      return buildListFromHeadTail(head, tail, 1)
    }

SourceElement
  = _ expr:Expression _ EOS _ { return expr }




/**
 * Lexical grammar
 */

// Whitespace & Control

__ = (WhiteSpace / LineTerminator / Comment)+ // Space required
_ = __* // Space allowed



// Automatic Semicolon Insertion

EOS
  = _ EOSToken
  / _ &[})\]]
  / _ EOF

EOF = !.



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



/**
 * Expressions
 */

PrimaryExpression
  = Identifier
  / Literal

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
    tail:(_ $AssignmentOperator _ AssignmentExpression)*
    { return buildBinaryExpression('Assignment', head, tail) }

Expression = AssignmentExpression



/**
 * Literals
 */

Literal = NumericLiteral



// Number

/* Numeric literals are expressed in base 2, 8, 10 or 16. */
NumericLiteral 'number' = val:(BinLiteral / OctLiteral / HexLiteral / DecLiteral) { return buildValue('NumericLiteral', val) }

/* A literal of any base that's not 10 is preceded by a special token. Base 10 can be an int or a real, and may have an exponent.*/
BinLiteral = BinLiteralToken val:$BinDigitToken+ { return parseInt(val, 2) }
OctLiteral = OctLiteralToken val:$OctDigitToken+ { return parseInt(val, 8) }
DecLiteral = val:(RealLiteral / IntegerLiteral) e:ExponentLiteral? { return val*10**e }
HexLiteral = HexLiteralToken val:$HexDigitToken+ { return parseInt(val, 16) }

/* An exponent consists of a special token followed by an optional sign and a required set of decimal digits */
ExponentLiteral = ExponentToken val:$(SignToken? DecDigitToken+) { return parseInt(val, 10) }

/* A decimal integer consists of a set of decimal digits */
IntegerLiteral = val:$DecDigitToken+ { return parseInt(val, 10) }

/* A decimal real consists of one or more decimal digits which are prefixed, postfixed or infixed with a special token */
RealLiteral
  = int:$DecDigitToken* DecimalPointToken frac:$DecDigitToken*
    &{ return int.length + frac.length > 0 }
    { return parseFloat(`${int}.${frac}`, 10) }




/**
 * Tokens
 */

// Misc

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

EOSToken = ';'



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
  = /*!Keyword*/ ident:$IdentifierName { return buildValue('Identifier', ident) }

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
