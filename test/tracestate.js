var test = require('tape')

const TraceState = require('../lib/tracestate')
test('TraceState basic functionality', function (t) {
  const mutableKey = 'mutable-key'
  const tracestate1 = new TraceState;
  t.ok(tracestate1, 'could instantiate TraceState')

  const string = '0003666f6f1033346630363761613062613930326237000362617204302e3235'
  const bytes = [
    0,  3, 102, 111, 111,
    16, 51, 52, 102, 48, 54,  55,  97,  97, 48, 98, 97,  57, 48, 50,  98,  55,
    0,  3, 98, 97, 114,
    4, 48,  46,  50,  53
  ];
  const json = { foo: '34f067aa0ba902b7', bar: '0.25', 'mutable-key':'' }
  const tracestate2 = TraceState.fromHexString(string, mutableKey)
  t.ok(tracestate2, 'could instantiate tracestate from hex string')

  t.equal(tracestate2.toString(), string, 'renders as hex string correctly')

  t.same(tracestate2.toArrayOfBytes(), bytes, 'renders as byte array correctly')
  t.same(tracestate2.toJson(), json, 'renders as json correctly')

  this.ok(tracestate2.addMutableValue('a','c'), 'accepts value from mutable key')

  this.ok(tracestate2.addMutableValue('blue','red'), 'accepts second value from mutable key')

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

  // to do: serializes back out as correct hex string

  // to do: validation when setting values

  // to do: validation when setting initial string
