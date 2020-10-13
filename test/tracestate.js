var test = require('tape')

const TraceState = require('../lib/tracestate')
test('TraceState basic functionality', function (t) {
  const mutableKey = 'mutable-key'
  const tracestate1 = new TraceState()
  t.ok(tracestate1, 'could instantiate TraceState')

  const string = '0003666f6f1033346630363761613062613930326237000362617204302e3235'
  const bytes = [
    0, 3, 102, 111, 111,
    16, 51, 52, 102, 48, 54, 55, 97, 97, 48, 98, 97, 57, 48, 50, 98, 55,
    0, 3, 98, 97, 114,
    4, 48, 46, 50, 53
  ]
  const json = { foo: '34f067aa0ba902b7', bar: '0.25', 'mutable-key': '' }
  const tracestate2 = TraceState.fromHexString(string, mutableKey)
  t.ok(tracestate2, 'could instantiate tracestate from hex string')

  t.equal(tracestate2.toString(), string, 'renders as hex string correctly')

  t.same(tracestate2.toArrayOfBytes(), bytes, 'renders as byte array correctly')
  t.same(tracestate2.toJson(), json, 'renders as json correctly')

  this.ok(tracestate2.addMutableValue('a', 'c'), 'accepts value from mutable key')

  this.ok(tracestate2.addMutableValue('blue', 'red'), 'accepts second value from mutable key')

  this.equals(tracestate2.getMutableValue('a'), 'c', 'can fetch value from mutable namespace')
  this.equals(tracestate2.getMutableValue('blue'), 'red', 'can fetch second value from mutable namespace')

  // the es vendor namespace has the value a:d,blue:red in this hex string
  const hexStringWithEsValues =
    '0003666f6f1033346630363761613062613930326237000265730c613a642c626c75653a726564000362617204302e3235'

  const tracestate3 = TraceState.fromHexString(hexStringWithEsValues, 'es')

  this.equals(
    tracestate3.getMutableValue('a'),
    'd',
    'can fetch mutable namespace value set from start'
  )

  this.equals(
    tracestate3.getMutableValue('blue'),
    'red',
    'can fetch mutable namespace value set from start'
  )

  tracestate3.addMutableValue('a', 'c')
  this.equals(
    tracestate3.getMutableValue('a'),
    'c',
    'can overwrite value set in initial buffer'
  )

  tracestate3.addMutableValue('a', 'c')
  this.equals(
    tracestate3.getMutableValue('blue'),
    'red',
    'overwriten value does not effect others set'
  )
  t.end()
})

test('TraceState serializing', function (t) {
  // hex string with no es value
  const string = '0003666f6f1033346630363761613062613930326237000362617204302e3235'
  const tracestate = TraceState.fromHexString(string, 'es')
  tracestate.addMutableValue('foo', 'bar')
  tracestate.addMutableValue('zip', 'zap')
  const newString = tracestate.toString()

  const tracestate2 = TraceState.fromHexString(newString, 'es')

  // the new values should be fetchable
  t.equals(tracestate2.getMutableValue('foo'), 'bar', 'value was serialized/unserialized correctly')
  t.equals(tracestate2.getMutableValue('zip'), 'zap', 'value was serialized/unserialized correctly')

  const json = tracestate2.toJson()

  // the non-es raw values should be untouched
  t.equals(json.foo, '34f067aa0ba902b7', 'foo vendor untouched')
  t.equals(json.bar, '0.25', 'bar vendor untouched')

  t.end()
})

test('TraceState Validation', function (t) {
  const didCreatingTraceStateThrow = (buffer, ns) => {
    try {
      const t2 = new TraceState(buffer, ns)
      t.ok(t2, 'create TraceState without throwing')
    } catch (e) {
      return true
    }
    return false
  }

  const justFits = new Array(256 + 1).join('x')
  const tooBig = new Array(257 + 1).join('x')
  const validVendorKey = [
    'abcdefghijklmnopqrstuvwxyz',
    '0123456789',
    '_-*/'
  ].join('')
  const invalidVendorKey = [
    'abcdefghijklmnopqrstuvwxyz',
    ':',
    '0123456789',
    '_-*/'
  ].join('')
  const buffer = Buffer.from([])

  t.ok(
    !didCreatingTraceStateThrow(buffer, justFits),
    'vendor namespace of 256 characters allowed'
  )

  t.ok(
    didCreatingTraceStateThrow(buffer, tooBig),
    'TraceState refuses to instantiate vendor namespace of 257 characters'
  )

  t.ok(
    !didCreatingTraceStateThrow(buffer, validVendorKey),
    'TraceState instantiates with valid vendor namespae'
  )

  t.ok(
    didCreatingTraceStateThrow(buffer, invalidVendorKey),
    'TraceState refusees to instantiate with invalid vendor namespae'
  )

  t.ok(
    didCreatingTraceStateThrow(buffer, 'fo=o'),
    'TraceState refusees to instantiate with invalid vendor namespae fo=o'
  )

  t.ok(
    didCreatingTraceStateThrow(buffer, 'fo,o'),
    'TraceState refusees to instantiate with invalid vendor namespae fo,o'
  )

  const t1 = new TraceState(buffer, 'es')
  t.ok(!t1.addMutableValue('f:oo', 'bar'), 'failed to set invalid key f:oo')
  t.ok(!t1.addMutableValue('foo-colon', 'ba:r'), 'failed to set invalid value ba:r')
  t.ok(!t1.addMutableValue('f;oo', 'bar'), 'failed to set invalid key bar')
  t.ok(!t1.addMutableValue('foo-semicolon', 'b;ar'), 'failed to set invalid value b;ar')
  t.ok(!t1.addMutableValue('f,oo', 'bar'), 'failed to set invalid key f,oo')
  t.ok(!t1.addMutableValue('foo-comma', 'b,ar'), 'failed to set invalid value b,ar')
  t.ok(!t1.addMutableValue('f=oo', 'bar'), 'failed to set invalid key f=oo')
  t.ok(!t1.addMutableValue('foo-equals', 'b,ar'), 'failed to set invalid value b,ar')

  t.ok(!t1.addMutableValue('foo-toolong', tooBig), 'failed to set value > 256 chars')
  t.ok(!t1.addMutableValue(tooBig, 'foo'), 'failed to set key > 256 chars')

  t.ok(t1.addMutableValue('foo', 'bar'), 'set valid key and value')

  t.ok(!t1.getMutableValue('f:oo'), 'did not set invalid key f:oo')
  t.ok(!t1.getMutableValue('f;oo'), 'did not set invalid key f;oo')
  t.ok(!t1.getMutableValue(tooBig), 'did not set super long key')
  t.ok(!t1.getMutableValue('foo-colon'), 'did not set invalid value for foo-colon key')
  t.ok(!t1.getMutableValue('foo-semicolon'), 'did not set invalid value for foo-semicolon key')
  t.ok(!t1.getMutableValue('foo-comma'), 'did not set invalid value for foo-comma key')
  t.ok(!t1.getMutableValue('foo-equals'), 'did not set invalid value for foo-equals key')
  t.ok(!t1.getMutableValue('foo-toolong'), 'did not set invalid value for foo-toolong key')

  t.equals(t1.getMutableValue('foo'), 'bar', 'did set valid value')

  const t2 = new TraceState(Buffer.from([]), 'es')
  t2.addMutableValue('foo', 'bar')
  t2.addMutableValue('zip', 'zap')
  // now, set a key and value that are <257 characters, but that
  // would result in the entire `es` value being greater than 256
  const oneTwenty = new Array(120 + 1).join('x')
  t2.addMutableValue(oneTwenty, oneTwenty)
  t.equals(t2.getMutableValue('foo'), 'bar', 'maintained value of foo key')
  t.equals(t2.getMutableValue('zip'), 'zap', 'maintained value of zip key')
  t.ok(!t2.getMutableValue(oneTwenty), 'did not set key/value that would put us over total character limit')

  // same as t2 test, but oneTwenty key is previously set
  const t3 = new TraceState(Buffer.from([]), 'es')
  t3.addMutableValue('foo', 'bar')
  t3.addMutableValue('zip', 'zap')
  t3.addMutableValue(oneTwenty, 'bees')
  // now, set a key and value that are <257 characters, but that
  // would result in the entire `es` value being greater than 256

  t3.addMutableValue(oneTwenty, oneTwenty)
  t.equals(t3.getMutableValue('foo'), 'bar', 'maintained value of foo key')
  t.equals(t3.getMutableValue('zip'), 'zap', 'maintained value of zip key')
  t.equals(t3.getMutableValue(oneTwenty), 'bees', 'maintained value of zip key')

  t.end()
})
