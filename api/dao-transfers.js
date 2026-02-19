// api/dao-transfers.js
// GET /api/dao-transfers?token=solo
// GET /api/dao-transfers?token=solo&refresh=true   (re-sync from Helius before returning)
//
// Returns all USDC transfers > $100 for the token's DAO wallet, grouped by month.
// On first call: backfills from TGE. On subsequent calls: returns from Supabase cache.

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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const tokenKey = (req.query.token || '').toLowerCase();
  const refresh = req.query.refresh === 'true';

  if (!tokenKey || !TOKENS[tokenKey]) {
    return res.status(400).json({ error: 'Invalid or missing token parameter' });
  }

  const token = TOKENS[tokenKey];
  if (!token.daoWallet) {
    return res.status(400).json({ error: 'No daoWallet configured for this token' });
  }

  try {
    // ── Check if we have any stored data for this token ──
    const { data: existing, error: existingErr } = await supabase
      .from('dao_transfers')
      .select('signature, timestamp')
      .eq('token', tokenKey)
      .order('timestamp', { ascending: false })
      .limit(1);

    if (existingErr) throw new Error('Supabase read error: ' + existingErr.message);

    const hasData = existing && existing.length > 0;
    const shouldSync = !hasData || refresh;

    if (shouldSync) {
      // ── Full backfill from TGE, or incremental sync from latest stored tx ──
      const latestSig = hasData ? existing[0].signature : null;
      await syncTransfers(tokenKey, token, latestSig);
    }

    // ── Return data from Supabase, grouped by month ──
    const { data: transfers, error: fetchErr } = await supabase
      .from('dao_transfers')
      .select('*')
      .eq('token', tokenKey)
      .order('timestamp', { ascending: true });

    if (fetchErr) throw new Error('Supabase fetch error: ' + fetchErr.message);

    const grouped = groupByMonth(transfers || []);
    const summary = buildSummary(transfers || []);

    return res.status(200).json({
      token: tokenKey,
      ticker: token.ticker,
      daoWallet: token.daoWallet,
      totalTransfers: (transfers || []).length,
      summary,
      months: grouped,
    });

  } catch (err) {
    console.error('dao-transfers error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// SYNC: Fetch from Helius and upsert into Supabase
// ═══════════════════════════════════════════════════════════════

async function syncTransfers(tokenKey, token, stopAtSignature) {
  console.log(`[${tokenKey}] Syncing transfers. Stop at: ${stopAtSignature || 'none (full backfill)'}`);

  const allTransfers = [];
  let beforeSig = null;
  let pageCount = 0;
  const maxPages = 50; // Safety limit — 50 pages × 100 txs = 5,000 txs max per sync

  while (pageCount < maxPages) {
    const batch = await fetchTransferPage(token.daoWallet, beforeSig);
    if (!batch || batch.length === 0) break;

    pageCount++;
    let hitStop = false;

    for (const tx of batch) {
      // If we've reached the last known signature, stop (incremental sync)
      if (stopAtSignature && tx.signature === stopAtSignature) {
        hitStop = true;
        break;
      }

      const parsed = parseUSDCTransfer(tx, token.daoWallet, tokenKey);
      if (parsed) allTransfers.push(parsed);
    }

    if (hitStop) break;

    // Pagination: use last signature as cursor
    beforeSig = batch[batch.length - 1].signature;

    // If we got fewer than 100, we've hit the end
    if (batch.length < 100) break;

    // Small delay to avoid rate limiting
    await sleep(150);
  }

  console.log(`[${tokenKey}] Found ${allTransfers.length} qualifying transfers across ${pageCount} pages`);

  if (allTransfers.length === 0) return;

  // Upsert into Supabase (signature is unique — safe to re-run)
  const { error } = await supabase
    .from('dao_transfers')
    .upsert(allTransfers, { onConflict: 'signature' });

  if (error) throw new Error('Supabase upsert error: ' + error.message);
  console.log(`[${tokenKey}] Upserted ${allTransfers.length} transfers`);
}

// ═══════════════════════════════════════════════════════════════
// FETCH: One page of 100 transactions from Helius Enhanced API
// ═══════════════════════════════════════════════════════════════

async function fetchTransferPage(walletAddress, beforeSig) {
  let url = `${HELIUS_ENHANCED_BASE}/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&type=TRANSFER&limit=100`;
  if (beforeSig) url += `&before=${beforeSig}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`Helius API error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Helius fetch error:', e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// PARSE: Extract USDC transfer from an enhanced transaction
// ═══════════════════════════════════════════════════════════════

function parseUSDCTransfer(tx, daoWallet, tokenKey) {
  if (!tx.tokenTransfers || tx.tokenTransfers.length === 0) return null;

  // Find all USDC transfers involving the DAO wallet
  for (const transfer of tx.tokenTransfers) {
    if (transfer.mint !== USDC_MINT) continue;

    const amount = transfer.tokenAmount || 0;
    if (amount < MIN_USDC) continue;

    const isOutflow = transfer.fromUserAccount === daoWallet;
    const isInflow = transfer.toUserAccount === daoWallet;
    if (!isOutflow && !isInflow) continue;

    const direction = isOutflow ? 'out' : 'in';
    const ts = new Date(tx.timestamp * 1000);
    const month = ts.toISOString().slice(0, 7); // 'YYYY-MM'

    return {
      token: tokenKey,
      signature: tx.signature,
      timestamp: ts.toISOString(),
      direction,
      amount_usdc: Math.round(amount * 100) / 100,
      from_wallet: transfer.fromUserAccount || null,
      to_wallet: transfer.toUserAccount || null,
      description: tx.description || null,
      month,
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// GROUP: Organize transfers by month for the timeline
// ═══════════════════════════════════════════════════════════════

function groupByMonth(transfers) {
  const map = {};

  for (const t of transfers) {
    if (!map[t.month]) {
      map[t.month] = {
        month: t.month,
        inflow: 0,
        outflow: 0,
        net: 0,
        count: 0,
        transfers: [],
      };
    }
    const m = map[t.month];
    if (t.direction === 'in') m.inflow += t.amount_usdc;
    else m.outflow += t.amount_usdc;
    m.net = m.inflow - m.outflow;
    m.count++;
    m.transfers.push({
      signature: t.signature,
      timestamp: t.timestamp,
      direction: t.direction,
      amount_usdc: t.amount_usdc,
      from_wallet: t.from_wallet,
      to_wallet: t.to_wallet,
      description: t.description,
    });
  }

  // Return sorted array oldest → newest
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY: Aggregate stats across all time
// ═══════════════════════════════════════════════════════════════

function buildSummary(transfers) {
  let totalInflow = 0, totalOutflow = 0;
  for (const t of transfers) {
    if (t.direction === 'in') totalInflow += t.amount_usdc;
    else totalOutflow += t.amount_usdc;
  }
  return {
    totalInflow: Math.round(totalInflow * 100) / 100,
    totalOutflow: Math.round(totalOutflow * 100) / 100,
    net: Math.round((totalInflow - totalOutflow) * 100) / 100,
    transferCount: transfers.length,
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
