class TokenOccurrence {
  constructor (content, totalLength) {
    this.location = null
    this.content = content
    this.totalLength = totalLength || content.length
  }

  setLocation (pos, str) {
    const s = str.slice(0, pos)
    this.location = {
      neighbourhood: [str.slice(Math.max(pos - 10, 0), pos), str.slice(pos, pos + 10)],
      line: (s.match(/\n/g) || []).length + 1,
      column: pos - (l => l >= 0 ? l + 1 : 0)(s.lastIndexOf('\n'))
    }
    var n
    if ((n = this.location.neighbourhood[0].lastIndexOf('\n')) !== -1) {
      this.location.neighbourhood[0] = this.location.neighbourhood[0].slice(n + 1)
    }
    if ((n = this.location.neighbourhood[1].indexOf('\n')) !== -1) {
      this.location.neighbourhood[1] = this.location.neighbourhood[1].slice(0, n)
    }
  }
}

module.exports = TokenOccurrence
