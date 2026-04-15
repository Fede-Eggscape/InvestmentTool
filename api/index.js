// Vercel serverless function — delegates to the Express app in backend/
// Note: all require()s must resolve via backend/node_modules/ (no root node_modules exists)
module.exports = require('../backend/server');
