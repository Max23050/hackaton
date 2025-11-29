// client.js
const http = require('http');
const { encodeMessage, decodeMessage } = require('./galacticbuf');

const requestObj = {
  name: 'Alice',
  user_id: 1001,
};

const body = encodeMessage(requestObj);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/example',
  method: 'POST',
  headers: {
    'Content-Type': 'application/octet-stream',
    'Content-Length': body.length,
  },
};

const req = http.request(options, (res) => {
  const chunks = [];

  res.on('data', (chunk) => {
    chunks.push(chunk);
  });

  res.on('end', () => {
    const respBuf = Buffer.concat(chunks);
    console.log('Raw hex response:', respBuf.toString('hex'));

    const decoded = decodeMessage(respBuf);
    console.log('Decoded response:', decoded);
  });
});

req.on('error', (err) => {
  console.error('Request error:', err);
});

req.write(body);
req.end();
