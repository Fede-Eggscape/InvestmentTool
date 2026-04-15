const binanceRouter = require('./binance');
const meteoraRouter = require('./meteora');
const marketRouter  = require('./market');

module.exports = (app) => {
  // Mount at /api/... (local dev + Render) AND at /... (Vercel strips the /api prefix)
  for (const prefix of ['/api', '']) {
    app.use(`${prefix}/binance`, binanceRouter);
    app.use(`${prefix}/meteora`, meteoraRouter);
    app.use(`${prefix}/market`,  marketRouter);
  }
};
