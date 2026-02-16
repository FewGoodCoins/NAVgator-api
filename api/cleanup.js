const { createClient } = require('@supabase/supabase-js');
const { TOKENS } = require('./_lib/tokens');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const cutoff = '2026-02-15T00:00:00Z';
  const dryRun = req.query.dry === 'true';

  // Count what would be deleted
  const { data: rows, error: countErr } = await supabase
    .from('nav_snapshots')
    .select('id, token, snapshot_time, nav, is_backfill')
    .eq('is_backfill', true)
    .lt('snapshot_time', cutoff);

  if (countErr) {
    return res.status(500).json({ error: countErr.message });
  }

  if (dryRun) {
    return res.status(200).json({
      mode: 'dry_run',
      wouldDelete: rows.length,
      cutoff,
      rows: rows.map(r => ({ token: r.token, date: r.snapshot_time, nav: r.nav })),
    });
  }

  // Delete old backfill rows before cutoff
  const { error: delErr } = await supabase
    .from('nav_snapshots')
    .delete()
    .eq('is_backfill', true)
    .lt('snapshot_time', cutoff);

  if (delErr) {
    return res.status(500).json({ error: delErr.message });
  }

  // Re-insert one TGE row per token
  const tgeInserted = [];
  for (const [key, token] of Object.entries(TOKENS)) {
    const tgeRow = {
      token: key,
      spot: 0,
      treasury_usdc: token.raise,
      effective_supply: token.icoSupply || token.supply,
      nav: token.icoPrice,
      snapshot_time: new Date(token.tge + 'T12:00:00Z').toISOString(),
      is_backfill: true,
    };
    const { error } = await supabase.from('nav_snapshots').insert(tgeRow);
    if (!error) tgeInserted.push(key);
  }

  res.status(200).json({
    mode: 'cleanup',
    deleted: rows.length,
    cutoff,
    tgeReinserted: tgeInserted,
  });
};
