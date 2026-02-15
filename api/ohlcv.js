const { TOKENS } = require('./_lib/tokens');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token, tf, time_from, time_to } = req.query;

  if (!token || !TOKENS[token]) {
    return res.status(400).json({ error: 'Missing or invalid ?token= parameter', available: Object.keys(TOKENS) });
  }

  const mint = TOKENS[token].mint;
  const birdeyeTF = { '12H': '12H', '1D': '1D', '1W': '1W', '1M': '1M' }[tf] || '1D';

  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'BIRDEYE_API_KEY not configured' });
  }

  try {
    const url = `https://public-api.birdeye.so/defi/ohlcv?address=${mint}&type=${birdeyeTF}&time_from=${time_from}&time_to=${time_to}`;
    const resp = await fetch(url, {
      headers: { 'X-API-KEY': apiKey, 'x-chain': 'solana' },
    });

    if (!resp.ok) {
      return res.status(resp.status).json({ error: 'Birdeye API returned ' + resp.status });
    }

    const data = await resp.json();

    // Cache for 5 minutes
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
