// server.js
const express = require('express');
const { encodeMessage, decodeMessage } = require('./galacticbuf');

const app = express();

// In-memory хранилище трейдов
// Позже /orders/take будет добавлять сюда записи
const trades = [];

// Health-check для платформы
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Публичный список трейдов в формате GalacticBuf
app.get('/trades', (req, res) => {
  try {
    // сортировка по timestamp DESC (новые сначала)
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
    res.status(200).send(buf);
  } catch (err) {
    console.error('Error in /trades:', err);
    res.status(500).send('Internal server error');
  }
});

// raw body для будущих бинарных POST-эндпоинтов (orders, auth и т.п.)
app.use(express.raw({ type: 'application/octet-stream', limit: '1mb' }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log('Server listening on port', port);
});
