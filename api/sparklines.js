const { TOKENS } = require('./tokens');

const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY;

// In-memory cache — survives across warm invocations
let _cache = {};
let _cacheTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=1800');

  // Return cache if fresh
  if (_cacheTime > 0 && Date.now() - _cacheTime < CACHE_TTL && Object.keys(_cache).length > 0) {
    return res.status(200).json({ sparklines: _cache, cached: true });
  }

  const now = Math.floor(Date.now() / 1000);
  const from = now - 30 * 86400; // 30 days
  const results = {};

  // Fetch all tokens sequentially (Birdeye rate limits)
  for (const [key, token] of Object.entries(TOKENS)) {
    if (!token.mint) continue;
    try {
      const url = `https://public-api.birdeye.so/defi/ohlcv?address=${token.mint}&type=12H&time_from=${from}&time_to=${now}`;
      const resp = await fetch(url, {
        headers: { 'X-API-KEY': BIRDEYE_KEY, 'x-chain': 'solana' },
      });
      const data = await resp.json();
      if (data.data && data.data.items && data.data.items.length > 1) {
        const items = data.data.items.slice(-60);
        results[key] = items.map(c => ({ t: c.unixTime, p: c.c }));
      }
    } catch (e) {
      // Skip failed tokens
    }
  }

  // Update cache
  _cache = results;
  _cacheTime = Date.now();

  return res.status(200).json({ sparklines: results, cached: false });
};
