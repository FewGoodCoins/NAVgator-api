const { TOKENS } = require('./_lib/tokens');

// GeckoTerminal OHLCV proxy — returns data in Birdeye-compatible format
// so the frontend doesn't need changes
module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token, tf } = req.query;

  if (!token || !TOKENS[token]) {
    return res.status(400).json({ error: 'Missing or invalid ?token= parameter', available: Object.keys(TOKENS) });
  }

  const tokenConfig = TOKENS[token];
  const poolAddress = tokenConfig.meteoraPool;
  if (!poolAddress) {
    return res.status(400).json({ error: 'No pool address configured for ' + token });
  }

  // Map our timeframes to GeckoTerminal format
  // GeckoTerminal: /ohlcv/day?aggregate=1, /ohlcv/hour?aggregate=12, /ohlcv/day?aggregate=7
  let gtTimeframe = 'day';
  let gtAggregate = 1;
  let limit = 365;

  switch (tf) {
    case '12H':
      gtTimeframe = 'hour';
      gtAggregate = 12;
      limit = 180;
      break;
    case '1D':
      gtTimeframe = 'day';
      gtAggregate = 1;
      limit = 365;
      break;
    case '1W':
      gtTimeframe = 'day';
      gtAggregate = 7;
      limit = 104;
      break;
    case '1M':
      gtTimeframe = 'day';
      gtAggregate = 1;
      limit = 365; // we'll aggregate monthly client-side
      break;
    default:
      gtTimeframe = 'day';
      gtAggregate = 1;
      limit = 365;
  }

  try {
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${gtTimeframe}?aggregate=${gtAggregate}&limit=${limit}&currency=usd&token=base`;
    const resp = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) {
      // If base token fails, try quote token
      const url2 = `https://api.geckoterminal.com/api/v2/networks/solana/pools/${poolAddress}/ohlcv/${gtTimeframe}?aggregate=${gtAggregate}&limit=${limit}&currency=usd&token=quote`;
      const resp2 = await fetch(url2, {
        headers: { 'Accept': 'application/json' },
      });
      if (!resp2.ok) {
        return res.status(resp2.status).json({ error: 'GeckoTerminal API returned ' + resp2.status });
      }
      const data2 = await resp2.json();
      const items = convertGeckoToBirdeye(data2, tokenConfig.mint);
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
      return res.status(200).json({ data: { items }, success: true });
    }

    const data = await resp.json();
    const items = convertGeckoToBirdeye(data, tokenConfig.mint);

    // Cache for 1 hour — daily candles don't change often
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600');
    res.status(200).json({ data: { items }, success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Convert GeckoTerminal OHLCV format to Birdeye-compatible format
// GeckoTerminal: ohlcv_list = [[timestamp, open, high, low, close, volume], ...]
// Birdeye: items = [{unixTime, o, h, l, c, v, address, type, currency}, ...]
function convertGeckoToBirdeye(geckoData, mint) {
  const ohlcvList = geckoData?.data?.attributes?.ohlcv_list;
  if (!ohlcvList || !Array.isArray(ohlcvList)) return [];

  return ohlcvList
    .map(candle => ({
      unixTime: candle[0],
      o: candle[1],
      h: candle[2],
      l: candle[3],
      c: candle[4],
      v: candle[5],
      address: mint,
      type: '1D',
      currency: 'usd',
    }))
    .sort((a, b) => a.unixTime - b.unixTime);
}
