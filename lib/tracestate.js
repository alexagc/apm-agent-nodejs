class Tracestate {
  constructor(buffer) {
    this.buffer = buffer
  }

  static fromHexString(string) {
    const buffer = Buffer.from(string,'hex')
    return new Tracestate(buffer);
  }

  toString() {
    return this.buffer.toString('hex')
  }

  toJson() {
    const bytes = this.toArrayOfBytes()
    const json = {}

    for(let i=0;i<bytes.length;i++) {
      const byte = bytes[i]
      if(0 === byte) {
        const indexOfKeyLength = i + 1
        const indexOfKey = i + 2
        const lengthKey = bytes[indexOfKeyLength]

        const indexOfValueLength = indexOfKey + lengthKey
        const indexOfValue = indexOfValueLength + 1
        const lengthValue = bytes[indexOfValueLength]

        const key = this.buffer.slice(indexOfKey, indexOfKey+lengthKey).toString()
        const value = this.buffer.slice(indexOfValue, indexOfValue+lengthValue).toString()

        json[key] = value
        continue;
      }
    }
    return json
  }

  toArrayOfBytes() {
    const bytes = []
    for(const [,byte] of this.buffer.entries()) {
      bytes.push(byte)
    }
    return bytes;
  }

}

module.exports = Tracestate
