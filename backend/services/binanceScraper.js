/**
 * Binance Dual Investment scraper using puppeteer-core + Chrome local.
 * Bypasses WAF by running a real browser session.
 * Only launches Chrome when cache is cold (every ~60s).
 */

const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const TARGET_URL  = 'https://www.binance.com/en/structured-products/dual-investment';

// Match both the investment bapi and any earn bapi URLs that return DCI data
const DATA_URL_PATTERNS = [
  /bapi\/investment.*dual/i,
  /bapi\/earn.*dual/i,
  /bapi\/earn.*daily.*product/i,
];

async function scrapeDualProducts() {
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--disable-extensions',
      ],
      timeout: 30000,
    });

    const page = await browser.newPage();

    // Intercept and capture the API response that carries product data
    const captured = [];
    page.on('response', async response => {
      const url = response.url();
      if (DATA_URL_PATTERNS.some(re => re.test(url))) {
        try {
          const json = await response.json();
          captured.push({ url, json });
          console.log(`[Scraper] Captured response from: ${url}`);
        } catch { /* not JSON */ }
      }
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ lang: 'en', clienttype: 'web' });

    console.log('[Scraper] Navigating to Binance Dual Investment page...');
    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 45000 });

    // Give the page a moment to fire any lazy-loaded API calls
    await new Promise(r => setTimeout(r, 3000));

    return captured.length > 0 ? captured : null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

/**
 * Try to extract a normalized product list from the captured responses.
 * Binance may return data in different shapes depending on the endpoint version.
 */
function extractProducts(captured) {
  for (const { url, json } of captured) {
    // Shape 1: { data: { list: [...] } }
    if (Array.isArray(json?.data?.list) && json.data.list.length > 0) {
      console.log(`[Scraper] Found ${json.data.list.length} products (shape: data.list)`);
      return json.data.list;
    }
    // Shape 2: { data: [...] }
    if (Array.isArray(json?.data) && json.data.length > 0) {
      console.log(`[Scraper] Found ${json.data.length} products (shape: data[])`);
      return json.data;
    }
    // Shape 3: { list: [...] }
    if (Array.isArray(json?.list) && json.list.length > 0) {
      console.log(`[Scraper] Found ${json.list.length} products (shape: list[])`);
      return json.list;
    }
  }
  return null;
}

module.exports = { scrapeDualProducts, extractProducts };
