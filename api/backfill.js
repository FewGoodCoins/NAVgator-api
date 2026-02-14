const { createClient } = require('@supabase/supabase-js');
const { TOKENS } = require('./_lib/tokens');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HELIUS_RPC = process.env.HELIUS_RPC_URL;
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Derive the Associated Token Account address for USDC on a wallet
// ATA = findProgramAddress([walletPubkey, TOKEN_PROGRAM, usdcMint], ATA_PROGRAM)
// We'll use getTokenAccountsByOwner RPC to find it instead of deriving
async function getUSDCATA(walletAddress) {
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
    return null;
  } catch (e) { return null; }
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
      const sigs = json.result || [];
      if (sigs.length === 0) break;

      allSigs.push(...sigs.map(s => s.signature));
      beforeSig = sigs[sigs.length - 1].signature;

      await new Promise(r => setTimeout(r, 200));
    } catch (e) { break; }
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
          if (tt.mint === USDC_MINT && (tt.fromUserAccount === walletAddress || tt.toUserAccount === walletAddress)) {
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

async function getUSDCTransfers(walletAddress) {
  // Step 1: Find the wallet's USDC token account
  const usdcATA = await getUSDCATA(walletAddress);
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
  if (!tokenKey || !TOKENS[tokenKey]) {
    return res.status(400).json({ error: 'Missing or invalid ?token= parameter', available: Object.keys(TOKENS) });
  }

  const token = TOKENS[tokenKey];

  try {
    // Step 1: Get current treasury balance for calibration
    const { fetchTokenData } = require('./_lib/tokens');
    const currentData = await fetchTokenData(tokenKey, token);
    
    // Step 2: Get all USDC transfers for DAO wallet
    const result = await getUSDCTransfers(token.daoWallet);
    const transfers = result.transfers;
    
    if (transfers.length === 0) {
      return res.status(200).json({ 
        token: tokenKey, 
        message: 'No USDC transfers found for DAO wallet',
        daoWallet: token.daoWallet,
        usdcATA: result.ata,
        totalTxnsScanned: result.totalTxns,
      });
    }

    // Step 3: Reconstruct daily DAO balances
    // We use daoUSDC portion only (from current data, subtract AMM portion)
    const daoOnlyUSDC = currentData.treasuryUSDC - (currentData.meteoraPoolUSDC || 0);
    const dailyBalances = reconstructDailyBalances(transfers, daoOnlyUSDC);

    // Step 4: For each day, calculate NAV
    // We approximate: total treasury = daoBalance + currentAmmUSDC (AMM stays roughly stable)
    // effective supply stays at current value (changes slowly)
    const ammUSDC = currentData.meteoraPoolUSDC || 0;
    const effectiveSupply = currentData.effectiveSupply;
    
    const snapshots = [];
    for (const [dateStr, daoBalance] of Object.entries(dailyBalances)) {
      const treasury = daoBalance + ammUSDC;
      const nav = treasury / effectiveSupply;
      snapshots.push({
        token: tokenKey,
        spot: 0, // we don't have historical spot from this method
        treasury_usdc: Math.round(treasury * 100) / 100,
        effective_supply: effectiveSupply,
        nav: Math.round(nav * 1000000) / 1000000,
        snapshot_time: dateStr + 'T12:00:00.000Z',
        is_backfill: true,
      });
    }

    // Step 5: Insert into Supabase (skip dates that already have snapshots)
    let inserted = 0, skipped = 0;
    for (const snap of snapshots) {
      // Check if snapshot already exists for this token+date
      const dateStart = snap.snapshot_time.split('T')[0] + 'T00:00:00.000Z';
      const dateEnd = snap.snapshot_time.split('T')[0] + 'T23:59:59.999Z';
      
      const { data: existing } = await supabase
        .from('nav_snapshots')
        .select('id')
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
      
      // Rate limit Supabase inserts
      if (inserted % 10 === 0) await new Promise(r => setTimeout(r, 100));
    }

    res.status(200).json({
      token: tokenKey,
      transfers: transfers.length,
      pagesScanned: result.pagesScanned,
      totalTxnsScanned: result.totalTxns,
      daysReconstructed: Object.keys(dailyBalances).length,
      inserted,
      skipped,
      currentNav: currentData.nav,
      firstDate: Object.keys(dailyBalances)[0],
      lastDate: Object.keys(dailyBalances).pop(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
};
