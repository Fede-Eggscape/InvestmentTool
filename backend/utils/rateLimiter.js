const pLimit = require('p-limit');
const { MAX_CONCURRENT_REQUESTS } = require('../config/constants');

const limit = pLimit(MAX_CONCURRENT_REQUESTS);

// Wrap an async function to run within the rate limit
function throttle(fn) {
  return limit(fn);
}

// Run an array of async factories with rate limiting
async function runLimited(asyncFactories) {
  return Promise.all(asyncFactories.map(fn => limit(fn)));
}

module.exports = { throttle, runLimited };
