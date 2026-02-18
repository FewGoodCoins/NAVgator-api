const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cxerugkxccbxtiucyvya.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const HELIUS_RPC = process.env.HELIUS_RPC_URL;
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const META_HOLDING = '6awyHMshBGVjJ3ozdSJdyyDE1CTAXUwrpNMaRGMsb4sf';

// Known MetaDAO-related program IDs and patterns
const METEORA_DLMM_PROGRAM = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo';
const FUTARCHY_PROGRAM = 'autoMBkfEwRVrjXTfN2aVFaA8rCTKHMzrAktVP7nmXG'; // autocrat

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { mint, name, ticker, twitter } = req.body;
    if (!mint || !name || !ticker) {
      return res.status(400).json({ error: 'mint, name, ticker required' });
    }

    // ══════════════════════════════════════════════
    // STEP 1: Basic token info
    // ══════════════════════════════════════════════
    const supply = await getTokenSupply(mint);
    if (!supply || supply.total === 0) {
      return res.status(400).json({ error: 'Invalid mint — could not fetch supply' });
    }

    // ══════════════════════════════════════════════
    // STEP 2: Get spot price from DexScreener
    // ══════════════════════════════════════════════
    const spot = await getSpotPrice(mint);

    // ══════════════════════════════════════════════
    // STEP 3: Find largest token holders
    // ══════════════════════════════════════════════
    const holders = await getLargestHolders(mint);

    // ══════════════════════════════════════════════
    // STEP 4: Find USDC balances of top holders
    // ══════════════════════════════════════════════
    const holderDetails = [];
    for (const h of holders.slice(0, 15)) {
      const usdcBal = await getTokenBalance(USDC_MINT, h.owner);
      holderDetails.push({
        address: h.owner,
        tokenBalance: h.amount,
        tokenPct: supply.total > 0 ? ((h.amount / supply.total) * 100).toFixed(2) + '%' : '?',
        usdcBalance: Math.round(usdcBal * 100) / 100,
      });
    }

    // ══════════════════════════════════════════════
    // STEP 5: Auto-classify wallets
    // ══════════════════════════════════════════════
    const classified = classifyWallets(holderDetails);

    // ══════════════════════════════════════════════
    // STEP 6: Find Meteora pools
    // ══════════════════════════════════════════════
    const meteoraPools = await findMeteoraPools(mint);

    // ══════════════════════════════════════════════
    // STEP 7: Find MetaDAO multisig holdings
    // ══════════════════════════════════════════════
    const metaHolding = await getTokenBalance(mint, META_HOLDING);

    // ══════════════════════════════════════════════
    // STEP 8: Build draft config
    // ══════════════════════════════════════════════
    const draft = {
      name: name.trim(),
      ticker: ticker.trim().toUpperCase(),
      mint: mint.trim(),
      usdcMint: USDC_MINT,
      spot,
      supply: {
        total: supply.total,
        decimals: supply.decimals,
      },
      holders: holderDetails,
      classified,
      meteoraPools,
      metaHoldingTokens: Math.round(metaHolding),
      // Suggested config (needs human review)
      suggestedConfig: {
        mint: mint.trim(),
        usdcMint: USDC_MINT,
        daoWallet: classified.likelyDAO || '???',
        futAmm: classified.likelyFutAmm || '???',
        metAmm: meteoraPools.length > 0 ? 'NEEDS_VAULT_ADDRESS' : '???',
        metAmmUsdc: meteoraPools.length > 0 ? 'NEEDS_VAULT_ADDRESS' : '???',
        teamLocked: classified.likelyTeamLock || null,
        buybackWallet: classified.likelyBuyback || null,
        pubMetPool: meteoraPools.length > 0 ? meteoraPools[0].address : '???',
        monthlyAllowance: '???_MANUAL',
      },
      twitter: twitter || null,
      discoveredAt: new Date().toISOString(),
    };

    // Save to Supabase
    const { error: dbError } = await supabase
      .from('token_submissions')
      .insert([{
        name: draft.name,
        ticker: draft.ticker,
        mint: draft.mint,
        twitter: twitter || '',
        status: 'discovered',
        notes: JSON.stringify(draft, null, 2),
        submitted_at: new Date().toISOString(),
      }]);

    if (dbError) console.error('DB save error:', dbError);

    return res.status(200).json({ success: true, draft });

  } catch (err) {
    console.error('Discovery error:', err);
    return res.status(500).json({ error: 'Discovery failed: ' + err.message });
  }
};

// ══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════

async function getTokenSupply(mint) {
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenSupply',
        params: [mint],
      }),
    });
    const json = await res.json();
    const val = json?.result?.value;
    return val ? { total: parseFloat(val.uiAmount || 0), decimals: val.decimals || 6 } : null;
  } catch (e) { return null; }
}

async function getSpotPrice(mint) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const data = await res.json();
    const pair = data.pairs?.find(p => p.quoteToken?.symbol === 'USDC');
    return pair ? parseFloat(pair.priceUsd) : 0;
  } catch (e) { return 0; }
}

async function getLargestHolders(mint) {
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenLargestAccounts',
        params: [mint],
      }),
    });
    const json = await res.json();
    const accounts = json?.result?.value || [];

    // For each token account, resolve the owner wallet
    const holders = [];
    for (const acct of accounts) {
      const owner = await getAccountOwner(acct.address);
      holders.push({
        tokenAccount: acct.address,
        owner: owner || acct.address,
        amount: parseFloat(acct.uiAmount || acct.amount / 1e6 || 0),
      });
    }

    return holders.sort((a, b) => b.amount - a.amount);
  } catch (e) { return []; }
}

async function getAccountOwner(tokenAccount) {
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getAccountInfo',
        params: [tokenAccount, { encoding: 'jsonParsed' }],
      }),
    });
    const json = await res.json();
    return json?.result?.value?.data?.parsed?.info?.owner || null;
  } catch (e) { return null; }
}

async function getTokenBalance(mint, owner) {
  if (!owner || !mint) return 0;
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountsByOwner',
        params: [owner, { mint }, { encoding: 'jsonParsed' }],
      }),
    });
    const json = await res.json();
    let total = 0;
    for (const acct of (json.result?.value || [])) {
      total += acct.account?.data?.parsed?.info?.tokenAmount?.uiAmount || 0;
    }
    return total;
  } catch (e) { return 0; }
}

async function findMeteoraPools(mint) {
  try {
    // Search Meteora API for pools containing this token
    const res = await fetch(`https://dlmm-api.meteora.ag/pair/all_by_groups?search_term=${mint}`);
    if (!res.ok) return [];
    const data = await res.json();

    const pools = [];
    const groups = data.groups || data || [];
    for (const group of (Array.isArray(groups) ? groups : [])) {
      const pairs = group.pairs || [group];
      for (const pair of pairs) {
        if (pair.mint_x === mint || pair.mint_y === mint) {
          const isUSDCPair = pair.mint_x === USDC_MINT || pair.mint_y === USDC_MINT;
          pools.push({
            address: pair.address,
            name: pair.name || `${pair.mint_x?.slice(0,4)}/${pair.mint_y?.slice(0,4)}`,
            isUSDCPair,
            tvl: pair.liquidity || 0,
            reserveX: pair.reserve_x_amount || 0,
            reserveY: pair.reserve_y_amount || 0,
          });
        }
      }
    }

    return pools.sort((a, b) => (b.tvl || 0) - (a.tvl || 0));
  } catch (e) { return []; }
}

function classifyWallets(holderDetails) {
  // Heuristics for auto-classifying wallets:
  // - DAO Treasury: has large USDC balance + large token balance
  // - Futarchy AMM: has USDC + tokens, but address pattern suggests program
  // - Team Locked: has tokens but no USDC
  // - Buyback: has tokens, smaller amount, no USDC

  let likelyDAO = null;
  let likelyFutAmm = null;
  let likelyTeamLock = null;
  let likelyBuyback = null;

  const withUSDC = holderDetails.filter(h => h.usdcBalance > 100);
  const withoutUSDC = holderDetails.filter(h => h.usdcBalance <= 100);

  // Largest USDC holder is likely the DAO
  if (withUSDC.length > 0) {
    const sorted = [...withUSDC].sort((a, b) => b.usdcBalance - a.usdcBalance);
    likelyDAO = sorted[0].address;
    // Second largest USDC holder is likely the futarchy AMM
    if (sorted.length > 1) {
      likelyFutAmm = sorted[1].address;
    }
  }

  // Wallets with tokens but no USDC — could be team locked or buyback
  if (withoutUSDC.length > 0) {
    const sorted = [...withoutUSDC].sort((a, b) => b.tokenBalance - a.tokenBalance);
    // Skip the first one if it's a pool (very high token count)
    for (const h of sorted) {
      if (h.address === META_HOLDING) continue;
      if (!likelyTeamLock) {
        likelyTeamLock = h.address;
      } else if (!likelyBuyback) {
        likelyBuyback = h.address;
        break;
      }
    }
  }

  return { likelyDAO, likelyFutAmm, likelyTeamLock, likelyBuyback };
}
