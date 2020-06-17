// These are in order of precedence; don't change the order.

const assoc = {
  LEFT: -1,
  RIGHT: 1
}

const prec = {
  // Decided that maybe/option should probably just be a no-op in case of null
  POST_N_ACCESS: [assoc.LEFT, Symbol('a-- a++ a?.b a.b a? a@?')],
  PRE_N_NOT: [assoc.RIGHT, Symbol('--a ++a `a !a ~a @a')],
  MATH_POW: [assoc.LEFT, Symbol('a**b')],
  MATH_MULT: [assoc.LEFT, Symbol('a/b a*b a%b')],
  MATH_PLUS: [assoc.LEFT, Symbol('a-b a+b')],
  BITSHIFT: [assoc.LEFT, Symbol('a<<b a>>b')],
  RANGE: [assoc.LEFT, Symbol('a..b')],
  LT_N_GT: [assoc.LEFT, Symbol('a>=b a<=b a>b a<b')],
  EQ_N_NEQ: [assoc.LEFT, Symbol('a!=b a==b')],
  B_AND: [assoc.LEFT, Symbol('a&b')],
  B_XOR: [assoc.LEFT, Symbol('a^b')],
  B_OR: [assoc.LEFT, Symbol('a|b')],
  L_AND: [assoc.LEFT, Symbol('a&&b')],
  L_XOR: [assoc.LEFT, Symbol('a^^b')],
  L_OR: [assoc.LEFT, Symbol('a||b')],
  ASSIGN: [assoc.RIGHT, Symbol('a=b a+=b a-=b a*=b a/=b a%=b a**=b a^=b a|=b a&=b a<<=b a>>=b')],
  EACH: [assoc.LEFT, Symbol('a:b')]
}

module.exports = prec
