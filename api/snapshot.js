const { createClient } = require('@supabase/supabase-js');
const { TOKENS, fetchTokenData } = require('./tokens');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  // Verify cron secret (Vercel sends this automatically)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = [];
  const errors = [];

  // Fetch all tokens in parallel
  const entries = Object.entries(TOKENS);
  const promises = entries.map(async ([key, token]) => {
    try {
      const data = await fetchTokenData(key, token);
      results.push(data);
    } catch (e) {
      errors.push({ token: key, error: e.message });
    }
  });

  await Promise.all(promises);

  // Write all snapshots to Supabase
  if (results.length > 0) {
    const rows = results.map(r => ({
      token: r.token,
      spot: r.spot,
      treasury_usdc: r.treasuryUSDC,
      on_chain_supply: r.onChainSupply,
      locked_tokens: r.lockedTokens,
      amm_tokens: r.ammTokens,
      effective_supply: r.effectiveSupply,
      nav: r.nav,
      dao_tokens: r.daoTokens,
      buyback_tokens: r.buybackTokens,
      investor_locked: r.investorLocked,
      meteora_pool_usdc: r.metAmmUSDC,
      meteora_pool_tokens: r.metAmmTokens,
      dao_usdc: r.daoUSDC,
      fut_amm_usdc: r.futAmmUSDC,
      met_amm_usdc: r.metAmmUSDC,
    }));

    const { error: insertError } = await supabase
      .from('nav_snapshots')
      .insert(rows);

    if (insertError) {
      errors.push({ db: insertError.message });
    }
  }

  res.status(200).json({
    ok: true,
    snapshots: results.length,
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  });
};
