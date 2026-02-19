// api/sync-transfers.js
// Called by Vercel cron to incrementally sync new DAO wallet USDC transfers.
// Only fetches transactions newer than the latest stored signature per token.
// Add to vercel.json crons:
//   { "path": "/api/sync-transfers", "schedule": "0 */6 * * *" }  (every 6 hours)

const { createClient } = require('@supabase/supabase-js');
const { TOKENS } = require('./tokens');

const supabase = createClient(
  'https://cxerugkxccbxtiucyvya.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_ENHANCED_BASE = 'https://api-mainnet.helius-rpc.com';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const MIN_USDC = 100;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = {};
  const liveTokens = Object.entries(TOKENS).filter(([, t]) => t.daoWallet);

  for (const [key, token] of liveTokens) {
    try {
      // Find the most recent signature we already have for this token
      const { data: latest } = await supabase
        .from('dao_transfers')
        .select('signature, timestamp')
        .eq('token', key)
        .order('timestamp', { ascending: false })
        .limit(1);

      const stopAtSig = latest && latest.length > 0 ? latest[0].signature : null;

      // Fetch only new transactions (stop when we hit the last known sig)
      const newTransfers = [];
      let beforeSig = null;
      let done = false;
      let pages = 0;

      while (!done && pages < 10) {
        let url = `${HELIUS_ENHANCED_BASE}/v0/addresses/${token.daoWallet}/transactions?api-key=${HELIUS_API_KEY}&type=TRANSFER&limit=100`;
        if (beforeSig) url += `&before=${beforeSig}`;

        const resp = await fetch(url);
        if (!resp.ok) { done = true; break; }
        const batch = await resp.json();
        if (!Array.isArray(batch) || batch.length === 0) { done = true; break; }

        for (const tx of batch) {
          if (stopAtSig && tx.signature === stopAtSig) { done = true; break; }
          const parsed = parseUSDCTransfer(tx, token.daoWallet, key);
          if (parsed) newTransfers.push(parsed);
        }

        beforeSig = batch[batch.length - 1].signature;
        if (batch.length < 100) done = true;
        pages++;
        await sleep(150);
      }

      if (newTransfers.length > 0) {
        const { error } = await supabase
          .from('dao_transfers')
          .upsert(newTransfers, { onConflict: 'signature' });
        if (error) throw new Error(error.message);
      }

      results[key] = { synced: newTransfers.length, pages };
      console.log(`[sync-transfers] ${key}: +${newTransfers.length} new transfers`);

    } catch (err) {
      results[key] = { error: err.message };
      console.error(`[sync-transfers] ${key} failed:`, err.message);
    }

    await sleep(300); // pause between tokens
  }

  return res.status(200).json({ ok: true, results, syncedAt: new Date().toISOString() });
};

function parseUSDCTransfer(tx, daoWallet, tokenKey) {
  if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) return null;
  for (const transfer of tx.tokenTransfers) {
    if (transfer.mint !== USDC_MINT) continue;
    const amount = transfer.tokenAmount || 0;
    if (amount < MIN_USDC) continue;
    const isOutflow = transfer.fromUserAccount === daoWallet;
    const isInflow = transfer.toUserAccount === daoWallet;
    if (!isOutflow && !isInflow) continue;
    const direction = isOutflow ? 'out' : 'in';
    const ts = new Date(tx.timestamp * 1000);
    return {
      token: tokenKey,
      signature: tx.signature,
      timestamp: ts.toISOString(),
      direction,
      amount_usdc: Math.round((transfer.tokenAmount || 0) * 100) / 100,
      from_wallet: transfer.fromUserAccount || null,
      to_wallet: transfer.toUserAccount || null,
      description: tx.description || null,
      month: ts.toISOString().slice(0, 7),
    };
  }
  return null;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
