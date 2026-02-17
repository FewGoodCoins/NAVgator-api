const { createClient } = require('@supabase/supabase-js');
const { TOKENS, fetchTokenData } = require('./tokens');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function formatRow(row) {
  return {
    token: row.token,
    ticker: TOKENS[row.token]?.ticker || row.token.toUpperCase(),
    spot: row.spot,
    treasuryUSDC: row.treasury_usdc,
    daoUSDC: row.dao_usdc,
    futAmmUSDC: row.fut_amm_usdc,
    metAmmUSDC: row.met_amm_usdc,
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
  };
}

module.exports = async function handler(req, res) {
  // Cache for 60s — reduces Supabase hits, Vercel edge serves cached response
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const tokenFilter = req.query.token?.toLowerCase();

  // Live mode: bypass Supabase, calculate from chain
  if (tokenFilter && req.query.live === '1' && TOKENS[tokenFilter]) {
    try {
      const data = await fetchTokenData(tokenFilter, TOKENS[tokenFilter]);
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  try {
    // Single token — one fast query
    if (tokenFilter) {
      const { data, error } = await supabase
        .from('nav_snapshots')
        .select('*')
        .eq('token', tokenFilter)
        .order('snapshot_time', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return res.status(200).json({ error: 'Token not found' });
      }
      return res.status(200).json(formatRow(data[0]));
    }

    // All tokens — single query, get latest per token
    const tokenKeys = Object.keys(TOKENS);
    const { data, error } = await supabase
      .from('nav_snapshots')
      .select('*')
      .in('token', tokenKeys)
      .order('snapshot_time', { ascending: false })
      .limit(tokenKeys.length * 2);

    if (error) throw error;

    // Pick most recent row per token
    const latest = {};
    for (const row of (data || [])) {
      if (!latest[row.token]) {
        latest[row.token] = formatRow(row);
      }
    }

    return res.status(200).json({ tokens: Object.values(latest) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
