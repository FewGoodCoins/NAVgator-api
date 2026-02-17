const { TOKENS } = require('./tokens');

const BIRDEYE_KEY = process.env.BIRDEYE_API_KEY;

module.exports = async function handler(req, res) {
  const tokenKey = (req.query.token || '').toLowerCase();
  const token = TOKENS[tokenKey];

  if (!token || !token.mint) {
    return res.status(400).json({ error: 'Unknown token' });
  }

  const tf = req.query.tf || '1D';
  const timeFrom = req.query.time_from || Math.floor(Date.now() / 1000) - 180 * 86400;
  const timeTo = req.query.time_to || Math.floor(Date.now() / 1000);

  // Map timeframe to Birdeye format
  const tfMap = { '6H': '6H', '12H': '12H', '1D': '1D', '1W': '1W', '1M': '1M' };
  const birdeyeTF = tfMap[tf] || '1D';

  try {
    const url = `https://public-api.birdeye.so/defi/ohlcv?address=${token.mint}&type=${birdeyeTF}&time_from=${timeFrom}&time_to=${timeTo}`;
    const resp = await fetch(url, {
      headers: { 'X-API-KEY': BIRDEYE_KEY, 'x-chain': 'solana' },
    });
    const data = await resp.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
