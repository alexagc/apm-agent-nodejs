var test = require('tape')

const TraceState = require('../lib/tracestate')
test('TraceState', function (t) {
  const tracestate1 = new TraceState;
  t.ok(tracestate1)

  const string = '0003666f6f1033346630363761613062613930326237000362617204302e3235'
  const bytes = [
    0,  3, 102, 111, 111,
    16, 51, 52, 102, 48, 54,  55,  97,  97, 48, 98, 97,  57, 48, 50,  98,  55,
    0,  3, 98, 97, 114,
    4, 48,  46,  50,  53
  ];
  const json = { foo: '34f067aa0ba902b7', bar: '0.25' }
  const tracestate2 = TraceState.fromHexString(string)
  t.ok(tracestate2)
  t.equal(tracestate2.toString(), string)
  t.same(tracestate2.toArrayOfBytes(), bytes)
  t.same(tracestate2.toJson(), json)

  t.end()
})
