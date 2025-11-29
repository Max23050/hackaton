const http = require('http');
const { decodeMessage } = require('./galacticbuf');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/trades',
  method: 'GET',
  headers: {
    'Accept': 'application/octet-stream',
  },
};

const req = http.request(options, (res) => {
  const chunks = [];

  res.on('data', (chunk) => {
    chunks.push(chunk);
  });

  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    console.log('Raw hex response:', buf.toString('hex'));

    const decoded = decodeMessage(buf);
    console.log('Decoded response:', JSON.stringify(decoded, null, 2));
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.end();
