var supabase = require('@supabase/supabase-js');
var tokens = require('./_lib/tokens');

var db = supabase.createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== 'Bearer ' + process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    var results = [];
    var errors = [];
    var entries = Object.entries(tokens.TOKENS);

    for (var i = 0; i < entries.length; i++) {
      var key = entries[i][0];
      var token = entries[i][1];
      try {
        var data = await tokens.fetchTokenData(key, token);
        results.push(data);

        var insertResult = await db.from('nav_snapshots').insert({
          token: key,
          spot: data.spot,
          treasury_usdc: data.treasuryUSDC,
          on_chain_supply: data.onChainSupply,
          locked_tokens: data.lockedTokens,
          amm_tokens: data.ammTokens,
          effective_supply: data.effectiveSupply,
          nav: data.nav,
          snapshot_time: data.timestamp,
        });

        if (insertResult.error) errors.push({ token: key, error: insertResult.error.message });
      } catch (e) {
        errors.push({ token: key, error: e.message });
      }

      await new Promise(function(r) { setTimeout(r, 500); });
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
