const binanceRouter = require('./binance');
const meteoraRouter = require('./meteora');
const marketRouter  = require('./market');

module.exports = (app) => {
  app.use('/api/binance', binanceRouter);
  app.use('/api/meteora', meteoraRouter);
  app.use('/api/market',  marketRouter);
};
