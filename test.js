const { encodeMessage, decodeMessage } = require('./galacticbuf');

// Пример 1
const msg1 = {
  user_id: 1001,
  name: 'Alice',
  scores: [100, 200, 300],
};

const buf1 = encodeMessage(msg1);
console.log('hex msg1:', buf1.toString('hex'));
console.log('decoded msg1:', decodeMessage(buf1));

// Пример 2
const msg2 = {
  timestamp: 1698765432,
  trades: [
    { id: 1, price: 100 },
    { id: 2, price: 200 },
  ],
};

const buf2 = encodeMessage(msg2);
console.log('hex msg2:', buf2.toString('hex'));
console.log('decoded msg2:', decodeMessage(buf2));
