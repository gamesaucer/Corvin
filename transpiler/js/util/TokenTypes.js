module.exports = {
  INVALID: Symbol('Invalid token, meant to be removed'),
  LIT: Symbol('Literal value, able to be evaluated at compile time'),
  IDENT: Symbol('Identifier, i.e. non-reserved names'),
  SEP: Symbol('Seperator, demarcates expressions'),
  OP: Symbol('Operator, does an operation on values or identifiers.'),
  TEMP: Symbol('Ambiguous without context, meant for the parser to determine the context of.')
}
