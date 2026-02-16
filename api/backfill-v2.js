const { createClient } = require('@supabase/supabase-js');
const { TOKENS } = require('./_lib/tokens');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HELIUS_RPC = process.env.HELIUS_RPC_URL;
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function getHeliusApiKey() {
  const match = HELIUS_RPC.match(/api-key=([^&]+)/);
  return match ? match[1] : '';
}

// ─── HELIUS HELPERS ───────────────────────────────────────────────────

async function getAllSignatures(address) {
  const allSigs = [];
  let beforeSig = undefined;
  for (let page = 0; page < 100; page++) {
    const params = [address, { limit: 1000 }];
    if (beforeSig) params[1].before = beforeSig;
    try {
      const res = await fetch(HELIUS_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params }),
      });
      const json = await res.json();
      if (json.error) break;
      const sigs = json.result || [];
      if (sigs.length === 0) break;
      allSigs.push(...sigs);
      beforeSig = sigs[sigs.length - 1].signature;
      await new Promise(r => setTimeout(r, 200));
    } catch (e) { break; }
  }
  return allSigs;
}

async function parseTransactionBatch(sigStrings) {
  const apiKey = getHeliusApiKey();
  const allTransfers = [];
  for (let i = 0; i < sigStrings.length; i += 100) {
    const batch = sigStrings.slice(i, i + 100);
    try {
      const res = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: batch }),
      });
      if (!res.ok) { await new Promise(r => setTimeout(r, 500)); continue; }
      const txns = await res.json();
      for (const tx of txns) {
        for (const tt of (tx.tokenTransfers || [])) {
          allTransfers.push({
            signature: tx.signature,
            timestamp: tx.timestamp,
            mint: tt.mint,
            amount: tt.tokenAmount,
            from: tt.fromUserAccount,
            to: tt.toUserAccount,
          });
        }
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) { console.error('Parse error:', e.message); }
  }
  return allTransfers;
}

// ─── BALANCE RECONSTRUCTION ───────────────────────────────────────────

// Given all transfers involving an address+mint, reconstruct balance at any point
function buildBalanceTimeline(allTransfers, address, mint, currentBalance) {
  const relevant = allTransfers
    .filter(t => t.mint === mint && (t.from === address || t.to === address))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (relevant.length === 0) {
    // No transfers found — balance was always currentBalance
    return { events: [], startBalance: currentBalance };
  }

  // Work backwards from current balance to find starting balance
  let startBalance = currentBalance;
  for (let i = relevant.length - 1; i >= 0; i--) {
    if (relevant[i].to === address) startBalance -= relevant[i].amount;
    if (relevant[i].from === address) startBalance += relevant[i].amount;
  }
  startBalance = Math.max(0, startBalance);

  // Build timeline: array of { timestamp, balance }
  const events = [];
  let balance = startBalance;
  for (const t of relevant) {
    if (t.to === address) balance += t.amount;
    if (t.from === address) balance -= t.amount;
    balance = Math.max(0, balance);
    events.push({ timestamp: t.timestamp, balance });
  }

  return { events, startBalance };
}

// Get balance at a specific timestamp from a timeline
function balanceAtTime(timeline, timestamp) {
  let balance = timeline.startBalance;
  for (const e of timeline.events) {
    if (e.timestamp > timestamp) break;
    balance = e.balance;
  }
  return balance;
}

// ─── MAIN BACKFILL ────────────────────────────────────────────────────

async function runBackfillV2(tokenKey, token, force) {
  const { fetchTokenData } = require('./_lib/tokens');

  // Step 1: Get current live state for calibration
  const current = await fetchTokenData(tokenKey, token);
  console.log(`[${tokenKey}] Live — treasury: $${current.treasuryUSDC}, effSupply: ${current.effectiveSupply}, NAV: $${current.nav}`);

  // Step 2: Gather all addresses we need transfer history for
  const addressesToScan = new Set();
  addressesToScan.add(token.daoWallet);
  if (token.futAmm) addressesToScan.add(token.futAmm);
  if (token.metAmm) addressesToScan.add(token.metAmm);
  if (token.metAmmUsdc) addressesToScan.add(token.metAmmUsdc);
  if (token.teamLocked) addressesToScan.add(token.teamLocked);
  if (token.buybackWallet) addressesToScan.add(token.buybackWallet);

  // Step 3: Pull all signatures for all addresses
  const allSigStrings = new Set();
  for (const addr of addressesToScan) {
    const sigs = await getAllSignatures(addr);
    for (const s of sigs) allSigStrings.add(s.signature);
    console.log(`[${tokenKey}] ${addr.substring(0, 8)}... → ${sigs.length} sigs`);
  }

  // Step 4: Parse all unique transactions
  const uniqueSigs = [...allSigStrings];
  console.log(`[${tokenKey}] Parsing ${uniqueSigs.length} unique transactions...`);
  const allTransfers = await parseTransactionBatch(uniqueSigs);
  console.log(`[${tokenKey}] Found ${allTransfers.length} token transfers`);

  // Step 5: Build balance timelines for each account+mint combo

  // USDC balances (treasury components)
  const daoUsdcTL = buildBalanceTimeline(allTransfers, token.daoWallet, USDC_MINT, current.daoUSDC || 0);
  const futAmmUsdcTL = token.futAmm
    ? buildBalanceTimeline(allTransfers, token.futAmm, USDC_MINT, current.futAmmUSDC || 0)
    : { events: [], startBalance: 0 };
  const metAmmUsdcTL = token.metAmmUsdc
    ? buildBalanceTimeline(allTransfers, token.metAmmUsdc, USDC_MINT, current.metAmmUSDC || 0)
    : { events: [], startBalance: 0 };

  // Token balances (excluded from effective supply)
  const onChainSupply = current.onChainSupply || token.supply;
  const futAmmTokenTL = token.futAmm
    ? buildBalanceTimeline(allTransfers, token.futAmm, token.mint, current.futAmmTokens || 0)
    : { events: [], startBalance: 0 };
  const metAmmTokenTL = token.metAmm
    ? buildBalanceTimeline(allTransfers, token.metAmm, token.mint, current.metAmmTokens || 0)
    : { events: [], startBalance: 0 };
  const teamLockedTL = token.teamLocked
    ? buildBalanceTimeline(allTransfers, token.teamLocked, token.mint, current.lockedTokens || 0)
    : { events: [], startBalance: 0 };
  const daoTokenTL = buildBalanceTimeline(allTransfers, token.daoWallet, token.mint, current.daoTokens || 0);
  const buybackTokenTL = token.buybackWallet
    ? buildBalanceTimeline(allTransfers, token.buybackWallet, token.mint, current.buybackTokens || 0)
    : { events: [], startBalance: 0 };

  // Step 6: Find DAO USDC outflow events (triggers for NAV snapshots)
  const daoOutflows = allTransfers
    .filter(t => t.mint === USDC_MINT && t.from === token.daoWallet && t.amount >= 1)
    .sort((a, b) => a.timestamp - b.timestamp);

  console.log(`[${tokenKey}] Found ${daoOutflows.length} DAO USDC outflows`);

  // Step 7: Build NAV snapshots — TGE + each outflow event
  const tgeTs = Math.floor(new Date(token.tge + 'T00:00:00Z').getTime() / 1000);
  const snapshots = [];

  // TGE snapshot: pinned to ICO price
  snapshots.push({
    token: tokenKey,
    timestamp: tgeTs,
    date: token.tge,
    dao_usdc: token.raise,
    fut_amm_usdc: 0,
    met_amm_usdc: 0,
    total_usdc: token.raise,
    fut_amm_tokens: 0,
    met_amm_tokens: 0,
    team_locked_tokens: 0,
    dao_tokens: 0,
    buyback_tokens: 0,
    effective_supply: token.supply,
    nav: token.icoPrice,
    trigger: 'TGE',
  });

  // Snapshot at each DAO outflow
  for (const outflow of daoOutflows) {
    const ts = outflow.timestamp;
    const date = new Date(ts * 1000).toISOString().split('T')[0];

    const daoUsdc = balanceAtTime(daoUsdcTL, ts);
    const futAmmUsdc = balanceAtTime(futAmmUsdcTL, ts);
    const metAmmUsdc = balanceAtTime(metAmmUsdcTL, ts);
    const totalUsdc = daoUsdc + futAmmUsdc + metAmmUsdc;

    const futAmmTokens = balanceAtTime(futAmmTokenTL, ts);
    const metAmmTokens = balanceAtTime(metAmmTokenTL, ts);
    const teamLockedTokens = balanceAtTime(teamLockedTL, ts);
    const daoTokens = balanceAtTime(daoTokenTL, ts);
    const buybackTokens = balanceAtTime(buybackTokenTL, ts);

    const excluded = futAmmTokens + metAmmTokens + teamLockedTokens + daoTokens + buybackTokens;
    const effectiveSupply = Math.max(1, onChainSupply - excluded);
    const nav = totalUsdc / effectiveSupply;

    snapshots.push({
      token: tokenKey,
      timestamp: ts,
      date,
      dao_usdc: Math.round(daoUsdc * 100) / 100,
      fut_amm_usdc: Math.round(futAmmUsdc * 100) / 100,
      met_amm_usdc: Math.round(metAmmUsdc * 100) / 100,
      total_usdc: Math.round(totalUsdc * 100) / 100,
      fut_amm_tokens: Math.round(futAmmTokens),
      met_amm_tokens: Math.round(metAmmTokens),
      team_locked_tokens: Math.round(teamLockedTokens),
      dao_tokens: Math.round(daoTokens),
      buyback_tokens: Math.round(buybackTokens),
      effective_supply: Math.round(effectiveSupply),
      nav: Math.round(nav * 1000000) / 1000000,
      trigger: `outflow_$${Math.round(outflow.amount)}`,
    });
  }

  // Final snapshot: current live state
  const nowTs = Math.floor(Date.now() / 1000);
  snapshots.push({
    token: tokenKey,
    timestamp: nowTs,
    date: new Date().toISOString().split('T')[0],
    dao_usdc: Math.round((current.daoUSDC || 0) * 100) / 100,
    fut_amm_usdc: Math.round((current.futAmmUSDC || 0) * 100) / 100,
    met_amm_usdc: Math.round((current.metAmmUSDC || 0) * 100) / 100,
    total_usdc: Math.round(current.treasuryUSDC * 100) / 100,
    fut_amm_tokens: Math.round(current.futAmmTokens || 0),
    met_amm_tokens: Math.round(current.metAmmTokens || 0),
    team_locked_tokens: Math.round(current.lockedTokens || 0),
    dao_tokens: Math.round(current.daoTokens || 0),
    buyback_tokens: Math.round(current.buybackTokens || 0),
    effective_supply: Math.round(current.effectiveSupply),
    nav: Math.round(current.nav * 1000000) / 1000000,
    trigger: 'live',
  });

  // Step 8: Write to Supabase nav_snapshots
  // Clear old backfill data for this token, then insert fresh
  if (force) {
    const { error: delErr } = await supabase
      .from('nav_snapshots')
      .delete()
      .eq('token', tokenKey)
      .eq('is_backfill', true);
    if (delErr) console.error(`[${tokenKey}] Delete error:`, delErr.message);
  }

  let inserted = 0;
  for (const snap of snapshots) {
    // Convert to nav_snapshots format
    const row = {
      token: tokenKey,
      spot: 0,
      treasury_usdc: snap.total_usdc,
      effective_supply: snap.effective_supply,
      nav: snap.nav,
      snapshot_time: new Date(snap.timestamp * 1000).toISOString(),
      is_backfill: true,
    };

    const { error } = await supabase.from('nav_snapshots').insert(row);
    if (!error) inserted++;
    else console.error(`[${tokenKey}] Insert error:`, error.message);
  }

  return {
    token: tokenKey,
    tge: token.tge,
    icoPrice: token.icoPrice,
    addressesScanned: addressesToScan.size,
    uniqueTransactions: uniqueSigs.length,
    totalTransfers: allTransfers.length,
    daoOutflows: daoOutflows.length,
    snapshots: snapshots.length,
    inserted,
    snapshotDetails: snapshots.map(s => ({
      date: s.date,
      trigger: s.trigger,
      totalUsdc: s.total_usdc,
      effectiveSupply: s.effective_supply,
      nav: s.nav,
    })),
  };
}

// ─── HTTP HANDLER ─────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const tokenKey = req.query.token;
  const force = req.query.force === 'true';

  if (tokenKey === 'all') {
    const results = {};
    for (const key of Object.keys(TOKENS)) {
      try {
        results[key] = await runBackfillV2(key, TOKENS[key], force);
      } catch (e) {
        results[key] = { error: e.message };
      }
    }
    return res.status(200).json({ mode: 'batch', results });
  }

  if (!tokenKey || !TOKENS[tokenKey]) {
    return res.status(400).json({ error: 'Invalid ?token=. Use solo/umbra/avici/omfg/rngr or all.' });
  }

  try {
    const result = await runBackfillV2(tokenKey, TOKENS[tokenKey], force);
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
};
