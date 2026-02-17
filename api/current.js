const { createClient } = require('@supabase/supabase-js');
const { TOKENS, fetchTokenData } = require('./tokens');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  const tokenFilter = req.query.token?.toLowerCase();

  // If a specific token is requested and we want live data, fetch it directly
  if (tokenFilter && req.query.live === '1' && TOKENS[tokenFilter]) {
    try {
      const data = await fetchTokenData(tokenFilter, TOKENS[tokenFilter]);
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Otherwise read latest snapshots from Supabase
  try {
    const tokenKeys = tokenFilter ? [tokenFilter] : Object.keys(TOKENS);
    const results = [];

    for (const key of tokenKeys) {
      const { data, error } = await supabase
        .from('nav_snapshots')
        .select('*')
        .eq('token', key)
        .order('snapshot_time', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) continue;

      const row = data[0];
      results.push({
        token: row.token,
        ticker: TOKENS[row.token]?.ticker || row.token.toUpperCase(),
        spot: row.spot,
        treasuryUSDC: row.treasury_usdc,
        onChainSupply: row.on_chain_supply,
        lockedTokens: row.locked_tokens,
        ammTokens: row.amm_tokens,
        effectiveSupply: row.effective_supply,
        nav: row.nav,
        daoTokens: row.dao_tokens,
        buybackTokens: row.buyback_tokens,
        investorLocked: row.investor_locked,
        meteoraPoolUSDC: row.meteora_pool_usdc,
        meteoraPoolTokens: row.meteora_pool_tokens,
        monthlyAllowance: TOKENS[row.token]?.monthlyAllowance || 0,
        snapshotTime: row.snapshot_time,
      });
    }

    // Single token request returns the object directly
    if (tokenFilter) {
      return res.status(200).json(results[0] || { error: 'Token not found' });
    }

    // Multi-token request returns { tokens: [...] }
    return res.status(200).json({ tokens: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
