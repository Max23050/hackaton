const test = require('node:test');
const assert = require('node:assert');
const { encodeMessage, decodeMessage } = require('./galacticbuf');

test('encode/decode simple message', () => {
  const msg = {
    user_id: 1001,
    name: 'Alice',
    scores: [100, 200, 300],
  };

  const buf = encodeMessage(msg);
  const decoded = decodeMessage(buf);

  assert.deepStrictEqual(decoded, msg);
});

test('hex matches example 1', () => {
  const msg = {
    user_id: 1001,
    name: 'Alice',
    scores: [100, 200, 300],
  };

  const buf = encodeMessage(msg);
  const hex = buf.toString('hex');

  const expectedHex =
    '0103004507757365725f69640100000000000003e9046e616d65020005416c6963650673636f72657303010003000000000000006400000000000000c8000000000000012c';

  assert.strictEqual(hex, expectedHex);
});

test('encode/decode list of objects (trades)', () => {
  const msg = {
    timestamp: 1698765432,
    trades: [
      { id: 1, price: 100 },
      { id: 2, price: 200 },
    ],
  };

  const buf = encodeMessage(msg);
  const decoded = decodeMessage(buf);

  assert.deepStrictEqual(decoded, msg);
});

test('list with different element types should fail', () => {
  const badMsg = {
    mixed: [1, 'two', 3],
  };

  assert.throws(() => {
    encodeMessage(badMsg);
  });
});
