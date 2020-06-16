// These are in order of precedence; don't change the order.
module.exports = {
  // Decided that maybe/option should probably just be a no-op in case of null
  POST_N_ACCESS: Symbol('a-- a++ a?.b a.b a? a@?'),
  PRE_N_NOT: Symbol('--a ++a -a +a !a ~a @a'),
  MATH_POW: Symbol('a**b'),
  MATH_MULT: Symbol('a/b a*b a%b'),
  MATH_PLUS: Symbol('a-b a+b'),
  BITSHIFT: Symbol('a<<b a>>b'),
  RANGE: Symbol('a..b'),
  LT_N_GT: Symbol('a>=b a<=b a>b a<b'),
  EQ_N_NEQ: Symbol('a!=b a==b'),
  B_AND: Symbol('a&b'),
  B_XOR: Symbol('a^b'),
  B_OR: Symbol('a|b'),
  L_AND: Symbol('a&&b'),
  L_XOR: Symbol('a^^b'),
  L_OR: Symbol('a||b'),
  ASSIGN: Symbol('a=b a+=b a-=b a*=b a/=b a%=b a**=b a^=b a|=b a&=b a<<=b a>>=b'),
  EACH: Symbol('a:b')
}
