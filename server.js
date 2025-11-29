const express = require('express');
const { encodeMessage, decodeMessage } = require('./galacticbuf');

const app = express();

// Нам нужен "сырой" body, а не JSON
app.use(express.raw({ type: 'application/octet-stream', limit: '1mb' }));

app.post('/example', (req, res) => {
  try {
    const incoming = decodeMessage(req.body);
    console.log('Incoming GalacticBuf:', incoming);

    const responseObj = {
      ok: 1,
      echo_name: incoming.name || 'unknown',
    };

    const buf = encodeMessage(responseObj);
    res.set('Content-Type', 'application/octet-stream');
    res.send(buf);
  } catch (err) {
    console.error(err);
    res.status(400).send('Bad GalacticBuf message');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server listening on port', port);
});
