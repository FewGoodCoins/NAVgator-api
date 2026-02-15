const { createClient } = require('@supabase/supabase-js');
const { TOKENS, fetchTokenData } = require('./_lib/tokens');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  // Verify cron secret in production (Vercel sends this header)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const results = [];
    const errors = [];

    // Fetch all tokens sequentially to avoid rate limits
    for (const [key, token] of Object.entries(TOKENS)) {
      try {
        const data = await fetchTokenData(key, token);

        // Sanity check: skip saving if treasury looks wrong (RPC failure, rate limit, etc.)
        if (data.treasuryUSDC < 100 || data.nav < 0.001 || !data.effectiveSupply) {
          errors.push({ token: key, error: 'Skipped: bad data (treasury=$' + data.treasuryUSDC.toFixed(2) + ', nav=' + data.nav.toFixed(6) + ')' });
          continue;
        }

        results.push(data);

        // Insert snapshot into Supabase
        const { error } = await supabase.from('nav_snapshots').insert({
          token: key,
          spot: data.spot,
          treasury_usdc: data.treasuryUSDC,
          on_chain_supply: data.onChainSupply,
          locked_tokens: data.lockedTokens,
          amm_tokens: data.ammTokens,
          dao_tokens: data.daoTokens,
          buyback_tokens: data.buybackTokens,
          multisig_tokens: data.multisigTokens,
          investor_locked: data.investorLocked,
          meteora_pool_usdc: data.meteoraPoolUSDC,
          meteora_pool_tokens: data.meteoraPoolTokens,
          effective_supply: data.effectiveSupply,
          nav: data.nav,
          snapshot_time: data.timestamp,
        });

        if (error) errors.push({ token: key, error: error.message });
      } catch (e) {
        errors.push({ token: key, error: e.message });
      }

      // Small delay between tokens to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }

    res.status(200).json({
      success: true,
      snapshots: results.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
