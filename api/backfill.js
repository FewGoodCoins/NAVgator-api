const { createClient } = require('@supabase/supabase-js');
const { TOKENS } = require('./_lib/tokens');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HELIUS_RPC = process.env.HELIUS_RPC_URL;
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Find the USDC token account for a wallet
async function getUSDCATA(walletAddress) {
  // Method 1: Standard RPC getTokenAccountsByOwner
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
        params: [walletAddress, { mint: USDC_MINT }, { encoding: 'jsonParsed' }],
      }),
    });
    const json = await res.json();
    const accounts = json.result?.value || [];
    if (accounts.length > 0) return accounts[0].pubkey;
  } catch (e) { console.error('ATA method 1 failed:', e.message); }

  // Method 2: Helius DAS getTokenAccounts
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getTokenAccounts',
        params: { owner: walletAddress, mint: USDC_MINT },
      }),
    });
    const json = await res.json();
    const accounts = json.result?.token_accounts || [];
    if (accounts.length > 0) return accounts[0].address;
  } catch (e) { console.error('ATA method 2 failed:', e.message); }

  return null;
}

// Get all transaction signatures for a specific token account (USDC ATA)
async function getSignaturesForAccount(accountAddress) {
  const allSigs = [];
  let beforeSig = undefined;

  for (let page = 0; page < 50; page++) {
    try {
      const params = [accountAddress, { limit: 1000 }];
      if (beforeSig) params[1].before = beforeSig;

      const res = await fetch(HELIUS_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params,
        }),
      });
      const json = await res.json();
      
      if (json.error) {
        console.error('RPC error:', JSON.stringify(json.error));
        break;
      }
      
      const sigs = json.result || [];
      if (sigs.length === 0) break;

      allSigs.push(...sigs.map(s => s.signature));
      beforeSig = sigs[sigs.length - 1].signature;

      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error('Sig fetch error:', e.message);
      break;
    }
  }

  return allSigs;
}

// Parse transaction signatures using Helius enhanced API to get USDC transfer details
async function parseTransactions(signatures, walletAddress) {
  const transfers = [];
  
  let apiKey = '';
  const match = HELIUS_RPC.match(/api-key=([^&]+)/);
  if (match) apiKey = match[1];
  else apiKey = HELIUS_RPC.split('/').pop().split('?')[0];

  // Process in batches of 100 (Helius limit)
  for (let i = 0; i < signatures.length; i += 100) {
    const batch = signatures.slice(i, i + 100);
    try {
      const res = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: batch }),
      });
      if (!res.ok) continue;
      const txns = await res.json();

      for (const tx of txns) {
        const tokenTransfers = tx.tokenTransfers || [];
        for (const tt of tokenTransfers) {
          if (tt.mint === USDC_MINT && (tt.fromUserAccount === walletAddress || tt.toUserAccount === walletAddress) && tt.tokenAmount >= 1) {
            transfers.push({
              signature: tx.signature,
              timestamp: tx.timestamp,
              date: new Date(tx.timestamp * 1000),
              amount: tt.tokenAmount,
              direction: tt.toUserAccount === walletAddress ? 'in' : 'out',
              from: tt.fromUserAccount,
              to: tt.toUserAccount,
            });
          }
        }
      }

      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  }

  transfers.sort((a, b) => a.timestamp - b.timestamp);
  return transfers;
}

async function getUSDCTransfers(walletAddress, configATA) {
  // Step 1: Find the wallet's USDC token account
  // Use config value first, fall back to RPC lookup
  let usdcATA = configATA || await getUSDCATA(walletAddress);
  if (!usdcATA) return { transfers: [], pagesScanned: 0, totalTxns: 0, ata: null };

  // Step 2: Get ALL signatures for just the USDC account (no noise from other tokens)
  const signatures = await getSignaturesForAccount(usdcATA);

  // Step 3: Parse those signatures with Helius to get transfer details
  const transfers = await parseTransactions(signatures, walletAddress);

  return { transfers, pagesScanned: 0, totalTxns: signatures.length, ata: usdcATA };
}

// Reconstruct daily DAO USDC balance from transaction history
function reconstructDailyBalances(transfers, currentBalance) {
  if (transfers.length === 0) return [];

  // Work backwards from current balance to figure out the starting balance
  // Then work forwards to get daily snapshots
  let runningBalance = currentBalance;
  
  // Walk backwards through transfers to find starting balance
  for (let i = transfers.length - 1; i >= 0; i--) {
    const t = transfers[i];
    if (t.direction === 'in') {
      runningBalance -= t.amount; // undo the inflow
    } else {
      runningBalance += t.amount; // undo the outflow
    }
  }
  // runningBalance is now the balance before the first transfer

  // Walk forwards, recording balance at each day
  const dailyBalances = {};
  let balance = runningBalance;
  const startDate = transfers[0].date;
  let txIdx = 0;

  // Generate a date for each day from first transfer to today
  const today = new Date();
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dayKey = d.toISOString().split('T')[0];

    // Apply all transfers that happened on this day
    while (txIdx < transfers.length) {
      const txDay = transfers[txIdx].date.toISOString().split('T')[0];
      if (txDay > dayKey) break;
      if (txDay === dayKey) {
        if (transfers[txIdx].direction === 'in') {
          balance += transfers[txIdx].amount;
        } else {
          balance -= transfers[txIdx].amount;
        }
      }
      txIdx++;
    }

    dailyBalances[dayKey] = Math.max(0, balance);
  }

  return dailyBalances;
}

module.exports = async function handler(req, res) {
  // Auth check
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized. Pass Bearer CRON_SECRET.' });
  }

  const tokenKey = req.query.token;

  // Batch mode: run all tokens
  if (tokenKey === 'all') {
    const results = {};
    for (const key of Object.keys(TOKENS)) {
      try {
        results[key] = await runBackfill(key, TOKENS[key], req.query.force === 'true');
      } catch (e) {
        results[key] = { error: e.message };
      }
    }
    return res.status(200).json({ mode: 'batch', results });
  }

  if (!tokenKey || !TOKENS[tokenKey]) {
    return res.status(400).json({ error: 'Missing or invalid ?token= parameter. Use ?token=all for batch.', available: Object.keys(TOKENS) });
  }

  try {
    const result = await runBackfill(tokenKey, TOKENS[tokenKey], req.query.force === 'true');
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
};

async function runBackfill(tokenKey, token, force) {
  try {
    // Step 1: Get current treasury balance for calibration
    const { fetchTokenData } = require('./_lib/tokens');
    const currentData = await fetchTokenData(tokenKey, token);
    
    // Step 2: Get all USDC transfers for DAO wallet
    const result = await getUSDCTransfers(token.daoWallet, token.daoUsdcATA);
    const transfers = result.transfers;
    
    if (transfers.length === 0) {
      // Debug: try a direct getSignaturesForAddress call to see what comes back
      let debugSigs = 0;
      let debugError = null;
      try {
        const debugRes = await fetch(HELIUS_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress',
            params: [result.ata, { limit: 5 }],
          }),
        });
        const debugJson = await debugRes.json();
        debugSigs = debugJson.result?.length || 0;
        debugError = debugJson.error || null;
      } catch (e) { debugError = e.message; }

      return { 
        token: tokenKey, 
        message: 'No USDC transfers found for DAO wallet',
        daoWallet: token.daoWallet,
        usdcATA: result.ata,
        totalTxnsScanned: result.totalTxns,
        debugSigsForATA: debugSigs,
        debugError,
        heliusRpcPrefix: HELIUS_RPC.substring(0, 40) + '...',
      };
    }

    // Step 3: Reconstruct treasury using raise-based approach
    // Pool-seeding transfers go to AMM wallets — those are still treasury, not spending
    const ammAddresses = new Set([
      token.futAmm, token.metAmm, token.pubMetPool, token.pubMetPoolLegacy
    ].filter(Boolean).map(a => a.toLowerCase()));

    const realOutflows = transfers.filter(t => {
      if (t.direction !== 'out') return false;
      if (t.to && ammAddresses.has(t.to.toLowerCase())) return false;
      return true;
    });
    realOutflows.sort((a, b) => a.timestamp - b.timestamp);

    const raise = token.raise || 0;
    const tgeDate = token.tge || transfers[0].date.toISOString().split('T')[0];
    const tgeTs = Math.floor(new Date(tgeDate + 'T00:00:00Z').getTime() / 1000);
    const nowTs = Math.floor(Date.now() / 1000);
    const totalDays = (nowTs - tgeTs) / 86400;

    // Effective supply at TGE was the full ICO supply
    const tgeSupply = token.supply;
    const currentEffSupply = currentData.effectiveSupply;

    // Helper: interpolate effective supply between TGE and now
    // Tokens gradually flowed into AMMs, reducing effective supply over time
    function effSupplyAt(timestamp) {
      const daysSinceTge = Math.max(0, (timestamp - tgeTs) / 86400);
      const progress = Math.min(1, daysSinceTge / totalDays);
      return tgeSupply + (currentEffSupply - tgeSupply) * progress;
    }

    // Step 4: Build event-driven snapshots
    // Only create snapshots at: TGE, each outflow event, and today
    const snapshots = [];

    // TGE snapshot: pinned to ICO price
    snapshots.push({
      token: tokenKey,
      spot: 0,
      treasury_usdc: raise,
      effective_supply: tgeSupply,
      nav: token.icoPrice,
      snapshot_time: tgeDate + 'T12:00:00.000Z',
      is_backfill: true,
    });

    // Snapshot at each real outflow event
    let treasury = raise;
    for (const outflow of realOutflows) {
      treasury -= outflow.amount;
      treasury = Math.max(0, treasury);
      const effSup = Math.round(effSupplyAt(outflow.timestamp));
      const nav = treasury / effSup;
      const dateStr = outflow.date.toISOString().split('T')[0];

      snapshots.push({
        token: tokenKey,
        spot: 0,
        treasury_usdc: Math.round(treasury * 100) / 100,
        effective_supply: effSup,
        nav: Math.round(nav * 1000000) / 1000000,
        snapshot_time: dateStr + 'T12:00:00.000Z',
        is_backfill: true,
      });
    }

    // Final snapshot: current live state (not backfill — will be skipped if cron already ran today)
    snapshots.push({
      token: tokenKey,
      spot: currentData.spot || 0,
      treasury_usdc: Math.round(currentData.treasuryUSDC * 100) / 100,
      effective_supply: currentEffSupply,
      nav: Math.round(currentData.nav * 1000000) / 1000000,
      snapshot_time: new Date().toISOString().split('T')[0] + 'T12:00:00.000Z',
      is_backfill: true,
    });

    // Step 5: Clear old backfill and insert fresh event-driven snapshots
    const forceUpdate = force;
    let inserted = 0, skipped = 0, updated = 0;

    // If force, delete ALL backfill for this token first for clean slate
    if (forceUpdate) {
      await supabase
        .from('nav_snapshots')
        .delete()
        .eq('token', tokenKey)
        .eq('is_backfill', true);
    }

    for (const snap of snapshots) {
      const dateStart = snap.snapshot_time.split('T')[0] + 'T00:00:00.000Z';
      const dateEnd = snap.snapshot_time.split('T')[0] + 'T23:59:59.999Z';

      const { data: existing } = await supabase
        .from('nav_snapshots')
        .select('id, is_backfill')
        .eq('token', tokenKey)
        .gte('snapshot_time', dateStart)
        .lte('snapshot_time', dateEnd)
        .limit(1);

      if (existing && existing.length > 0) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from('nav_snapshots').insert(snap);
      if (!error) inserted++;
    }

    // Step 6: Save raw transfers to usdc_transfers table
    let transfersSaved = 0;
    for (const t of transfers) {
      try {
        const { error } = await supabase.from('usdc_transfers').upsert({
          token: tokenKey,
          direction: t.direction,
          amount: t.amount,
          tx_date: t.date.toISOString(),
          signature: t.signature,
        }, { onConflict: 'token,signature' });
        if (!error) transfersSaved++;
      } catch (e) {}
    }

    return {
      token: tokenKey,
      raise: token.raise,
      tge: token.tge,
      icoPrice: token.icoPrice,
      transfers: transfers.length,
      realOutflows: realOutflows.length,
      poolSeedingFiltered: transfers.filter(t => t.direction === 'out').length - realOutflows.length,
      transfersSaved,
      snapshots: snapshots.length,
      inserted,
      skipped,
      forceUpdate,
      currentNav: currentData.nav,
      snapshotDetails: snapshots.map(s => ({
        date: s.snapshot_time.split('T')[0],
        treasury: s.treasury_usdc,
        effSupply: s.effective_supply,
        nav: s.nav,
      })),
    };
  } catch (e) {
    return { token: tokenKey, error: e.message };
  }
}
