const express = require('express');
const { encodeMessage, decodeMessage } = require('./galacticbuf');

const app = express();

const trades = [];

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/trades', (req, res) => {
  try {
    const sortedTrades = [...trades].sort((a, b) => b.timestamp - a.timestamp);

    const responseObj = {
      trades: sortedTrades.map((t) => ({
        trade_id: t.trade_id,
        buyer_id: t.buyer_id,
        seller_id: t.seller_id,
        price: t.price,
        quantity: t.quantity,
        timestamp: t.timestamp,
      })),
    };

    const buf = encodeMessage(responseObj);
    res.set('Content-Type', 'application/octet-stream');
    res.send(buf);
  } catch (err) {
    console.error('Error in /trades:', err);
    res.status(500).send('Internal server error');
  }
});

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
