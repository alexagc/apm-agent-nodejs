/**
 * Class for Managing Tracestate
 *
 * Class that creates objects for managing trace state.
 * This class allows you to pick a single mutable vendor
 * namespace for setting/getting values in the elastic
 * format while preserving the byte value of the
 * non-mutable namespace.
 */
class TraceState {
  constructor (buffer, mutableNamespace = 'es') {
    if (!this._validateVendorKey(mutableNamespace)) {
      throw new Error('Vendor namespace failed validation.')
    }

    // the inital byte representation of of the data
    // the "source of truth" for non-mutable data
    this.buffer = buffer

    // the single vendor namespace that we're allowed
    // to read and write from (i.e. "mutable").
    this.mutableNamespace = mutableNamespace

    // the key/value pairs we're storing for the single
    // mutable vendor namespace
    this.mutableValues = {}
  }

  static fromHexString (string, mutableNamespace = 'es') {
    const buffer = Buffer.from(string, 'hex')
    return new TraceState(buffer, mutableNamespace)
  }

  _validateVendorKey (key) {
    if (key.length > 256 || key.length < 1) {
      return false
    }

    const re = new RegExp(
      '^[abcdefghijklmnopqrstuvwxyz0123456789_\\-\\*/]*$'
    )
    if (!key.match(re)) {
      return false
    }
    return true
  }

  _validateElasicKeyAndValue (key, value) {
    // 0x20` to `0x7E WITHOUT `,` or `=` or `;` or `;`
    const re = /^[ \][!"#$%&'()*+\-./0123456789<>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ^_abcdefghijklmnopqrstuvwxyz{|}~]*$/

    if (!key.match(re) || !value.match(re)) {
      return false
    }

    if (key.length > 256 || value.length > 256) {
      return false
    }

    return true
  }

  addMutableValue (key, value) {
    if (!this._validateElasicKeyAndValue(key, value)) {
      return false
    }

    const oldValue = this.mutableValues[key]
    this.mutableValues[key] = value

    // if new length is greater than 256, undo the setting
    const serializedValue = this._serializeMutableValues(this.mutableValues)
    if (serializedValue.length > 256 && (typeof oldValue === 'undefined')) {
      delete this.mutableValues[key]
    }
    if (serializedValue.length > 256 && (typeof oldValue !== 'undefined')) {
      this.mutableValues[key] = oldValue
    }

    return true
  }

  getMutableValue (keyToGet) {
    const values = this.toJson()
    const rawMutableValue = values[this.mutableNamespace]
    for (const [, keyValue] of rawMutableValue.split(',').entries()) {
      if (!keyValue) { continue }
      const [key, value] = keyValue.split(':')
      if (key === keyToGet) {
        return value
      }
    }
  }

  toString () {
    // we have a buffer that has vendor values we
    // should not touch, and maybe has es values

    // we also have an internal representation of the es values

    // we need to walk the byte array, and reconstruct a new byte
    // array that has the old vendor values.  Then we need to
    // take the internal representation of the mutable values and
    // encode those into the byte array.  Then we need to take
    // the byte array, make a buffer, and convert it to a string

    const bytes = this.toArrayOfBytes()
    let newBytes = []
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i]
      if (byte === 0) {
        const indexOfKeyLength = i + 1
        const indexOfKey = i + 2
        const lengthKey = bytes[indexOfKeyLength]

        const indexOfValueLength = indexOfKey + lengthKey
        const indexOfValue = indexOfValueLength + 1
        const lengthValue = bytes[indexOfValueLength]

        const key = this.buffer.slice(indexOfKey, indexOfKey + lengthKey).toString()
        // bail out if this is our mutable namespace
        if (key === this.mutableNamespace) { continue }

        // otherwise copy from the `0` byte to the end of the value
        newBytes = newBytes.concat(bytes.slice(i, indexOfValue + lengthValue))

        // skip ahead to first byte after end of value
        i = indexOfValue + lengthValue - 1
        continue
      }
    }

    // now serialize the internal representation
    if (Object.keys(this.mutableValues).length > 0) {
      // the zero byte
      newBytes.push(0)

      // the length of the vendor namespace
      newBytes.push(this.mutableNamespace.length)

      // the chars of the vendor namespace
      for (let i = 0; i < this.mutableNamespace.length; i++) {
        newBytes.push(this.mutableNamespace.charCodeAt(i))
      }

      // add the length of the value
      const serializedValue = this._serializeMutableValues(this.mutableValues)
      newBytes.push(serializedValue.length)

      // add the bytes of the value
      for (let i = 0; i < serializedValue.length; i++) {
        newBytes.push(serializedValue.charCodeAt(i))
      }
    }

    return Buffer.from(newBytes).toString('hex')
  }

  /**
   * Returns "raw" values of vendored byte array
   */
  toJson () {
    const bytes = this.toArrayOfBytes()
    const json = {}

    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i]
      if (byte === 0) {
        const indexOfKeyLength = i + 1
        const indexOfKey = i + 2
        const lengthKey = bytes[indexOfKeyLength]

        const indexOfValueLength = indexOfKey + lengthKey
        const indexOfValue = indexOfValueLength + 1
        const lengthValue = bytes[indexOfValueLength]

        const key = this.buffer.slice(indexOfKey, indexOfKey + lengthKey).toString()
        const value = this.buffer.slice(indexOfValue, indexOfValue + lengthValue).toString()

        json[key] = value

        // skip ahead
        i = indexOfValue + lengthValue - 1
        continue
      }
    }

    // if the buffer has values that are not set in the
    // internal representation, add them to the
    // internal representation.
    if (json[this.mutableNamespace]) {
      for (const [, rawValue] of json[this.mutableNamespace].split(',').entries()) {
        const [key, value] = rawValue.split(':')
        if (this.mutableValues[key]) { continue }
        this.mutableValues[key] = value
      }
    }

    // then, serialize  values from the internal representation. This means
    // we end up prefer values set in the internal representation over
    // values set in the initial buffer
    json[this.mutableNamespace] = this._serializeMutableValues(
      this.mutableValues
    )
    return json
  }

  _serializeMutableValues (string) {
    let mutableString = ''
    for (const [key, value] of Object.entries(string)) {
      mutableString += `${key}:${value},`
    }
    return mutableString
  }

  toArrayOfBytes () {
    const bytes = []
    for (const [, byte] of this.buffer.entries()) {
      bytes.push(byte)
    }
    return bytes
  }
}

module.exports = TraceState
