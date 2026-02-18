// ═══════════════════════════════════════════════════════════════════════
// TOKEN CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════
// Each token has:
//   daoWallet    = DAO treasury (holds USDC)
//   futAmm       = Futarchy AMM (holds USDC + project tokens)
//   metAmm       = Meteora AMM token vault (project tokens)
//   metAmmUsdc   = Meteora AMM USDC vault
//   teamLocked   = Team performance lock wallet
//   pubMetPool   = Meteora DLMM pool address (for reserve queries)

const TOKENS = {
  solo: {
    ticker: 'SOLO', name: 'Solomon',
    mint: 'SoLo9oxzLDpcq1dpqAgMwgce5WqkRDtNXK7EPnbmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '98SPcyUZ2rqM2dgjCqqSXS4gJrNTLSNUAAVCF38xYj9u',
    futAmm: 'DzYtzoNvPbyFCzwZA6cSm9eDEEmxEB9f8AGkJXUXgnSA',
    metAmm: 'HaFkQ6qEYzU7fXxSdMgLJH9LQ2piNa58WpbK8uyLRL1e',
    metAmmUsdc: '6suP5vppzxwp141dSguWLeVeeKzBYpS8iuWNM3SqmBmh',
    teamLocked: 'Bo24B7DDVtpa9VxZ4LN8FrAT7TM3cgkri41a5GjFg5Dk',
    pubMetPool: '2zsbECzM7roqnDcuv2TNGpfv5PAnuqGmMo5YPtqmUz5p',
    monthlyAllowance: 100000,
  },
  umbra: {
    ticker: 'UMBRA', name: 'Umbra',
    mint: 'PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '6VsC8PuKkXm5xo54c2vbrAaSfQipkpGHqNuKTxXFySx6',
    futAmm: 'BLkBSE96kQys7SrMioKxeMiVbeo4Ckk2Y4n1JphKxYnv',
    metAmm: 'CyjajhA1UR2SZBLyEY7j2GKZuDSmXEEkVzb1qLCmZbFB',
    metAmmUsdc: '8KeZkHebowZDdCtS7FLmdNTrGM3ffAup7guwmhdRPEve',
    teamLocked: '3kX3EWm9iPB6oxFS2NJ71L6v5wzFZ8rQMEG6HC8QHJtF',
    pubMetPool: '7dVri3qjYD3uobSZL3Zth8vSCgU6r6R2nvFsh7uVfDte',
    pubMetPoolLegacy: 'BLkBSE96kQys7SrMioKxeMiVbeo4Ckk2Y4n1JphKxYnv',
    monthlyAllowance: 100000,
  },
  avici: {
    ticker: 'AVICI', name: 'Avicenna',
    mint: 'BANKJmvhT8tiJRsBSS1n2HryMBPvT5Ze4HU95DUAmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: 'DGgYoUcu1aDZt4GEL5NQiducwHRGbkMWsUzsXh2j622G',
    futAmm: '3D854kknnQhu9xVaRNV154oZ9oN2WF3tXsq3LDu7fFMn',
    metAmm: 'DspDxKwCcR399EYJUyh42KHyBEJGxy82XUBiHy62Fnmi',
    metAmmUsdc: 'G4SqKyYyJbXw97tm5DJsTyFxaZ7TxCPykEBSVpFkNGsQ',
    pubMetPool: '5gB4NPgFB3MHFHSeKN4sbaY6t9MB8ikCe9HyiKYid4Td',
    pubMetPoolLegacy: '3D854kknnQhu9xVaRNV154oZ9oN2WF3tXsq3LDu7fFMn',
    monthlyAllowance: 100000,
  },
  omfg: {
    ticker: 'OMFG', name: 'OMFG',
    mint: 'omfgRBnxHsNJh6YeGbGAmWenNkenzsXyBXm3WDhmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '34rned2SLUcYjUrM9meQkuyJY4QDBcKhkcUPXCgGuXD9',
    futAmm: '2WNhaB6TPyZ3ynJjAUM4ZZ1Hdeep8FJ3A76FjGjTVjjS',
    metAmm: '9EJMgC4PDGYsG6Es3wFH5A2mzi7yUVm7SomBHRJwktuj',
    metAmmUsdc: '7EaYPt9Gx6qDDfXV9EPbdjJ4tqMgkASjpXNpD5Mvnpb5',
    pubMetPool: 'BiNnErm2VDkbKGiABj9ZRUjybz879NhH2heeWE7m5M6d',
    pubMetPoolLegacy: '2WNhaB6TPyZ3ynJjAUM4ZZ1Hdeep8FJ3A76FjGjTVjjS',
    monthlyAllowance: 50000,
  },
  rngr: {
    ticker: 'RNGR', name: 'Ranger',
    mint: 'RNGRtJMbCveqCp7AC6U95KmrdKecFckaJZiWbPGmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '55H1Q1YrHJQ93uhG4jqrBBHx3a8H7TCM8kvf2UM2g5q3',
    futAmm: '1PAwyDkWNFCcR96GhEReXHJBv3YEFVazCaQgNicVuKv',
    metAmm: 'uQedNHbW2nhoHQWzNaCTUkYzTaiftEcxsWcSRQXTC6s',
    metAmmUsdc: '4KsMJLjEMai33cJoMJSePNz6zPEaYshcSbhxVPVesgrR',
    buybackWallet: '33AEddb7BxoA7Y65BzybFCV5WyGy7LfBdjiL2anCDEkr',
    teamLocked: 'F35JE1HZMtZXXWdy3koSPRe1gGFQyqd5kpbPw2xNcjR8',
    pubMetPool: '59WuweKV7DAg8aUgRhNytScQxioaFYNJdWnox5FxAXFq',
    pubMetPoolLegacy: '1PAwyDkWNFCcR96GhEReXHJBv3YEFVazCaQgNicVuKv',
    investorVesting: { total: 4356250, months: 24, tge: '2026-01-10' },
    monthlyAllowance: 250000,
  },
  loyal: {
    ticker: 'LOYAL', name: 'Loyal',
    mint: 'LYLikzBQtpa9ZgVrJsqYGQpR3cC1WMJrBHaXGrQmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: 'AQyyTwCKemeeMu8ZPZFxrXMbVwAYTSbBhi1w4PBrhvYE',
    futAmm: 'GxpJkPEsPmuRCCTNnfZaDKg4X3gf4ZPgmqgFqtibaPtK',
    metAmm: 'GHh8ccGPYcB6mBQEsrc6BraMmATckZJAjG1ubRBzARub',
    metAmmUsdc: '5p1gfTgosp5ANC6PVqKUXNBSNqpLnfLjHT38o3fUKEAe',
    teamLocked: '9D6ceZNbP5LaYoCco9DFixhnhDV8ngK8ojF9mLsroqx3',
    buybackWallet: 'AfGAjj7TQByC2WQtCNRhsyq1WeZqmQ7oNRoGb2JbgoQg',
    pubMetPool: 'GxpJkPEsPmuRCCTNnfZaDKg4X3gf4ZPgmqgFqtibaPtK',
    monthlyAllowance: 60000,
  },
};

// ═══════════════════════════════════════════════════════════════════════
// ON-CHAIN DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════

const HELIUS_RPC = process.env.HELIUS_RPC_URL;

// MetaDAO multisig — tokens here aren't eligible for NAV redemption
const META_HOLDING = '6awyHMshBGVjJ3ozdSJdyyDE1CTAXUwrpNMaRGMsb4sf';

// Get balance of a specific token (by mint) held by a wallet
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

// Get balance of a specific token account (vault address, not wallet)
async function getVaultBalance(tokenAccount) {
  if (!tokenAccount) return 0;
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'getTokenAccountBalance',
        params: [tokenAccount],
      }),
    });
    const json = await res.json();
    return json.result?.value?.uiAmount || 0;
  } catch (e) { return 0; }
}

// Get USDC balance of a wallet
async function getUSDCBalance(usdcMint, owner) {
  return getTokenBalance(usdcMint, owner);
}

// Get total minted supply of a token
async function getOnChainSupply(mint) {
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
    return parseFloat(json?.result?.value?.uiAmount || 0);
  } catch (e) { return 0; }
}

// Get spot price from DexScreener, fallback to Birdeye
async function getSpotPrice(mint) {
  // Try DexScreener first
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const data = await res.json();
    // Look for USDC pair first, then any pair with priceUsd
    const pair = data.pairs?.find(p => p.quoteToken?.symbol === 'USDC')
      || data.pairs?.find(p => parseFloat(p.priceUsd) > 0);
    if (pair && parseFloat(pair.priceUsd) > 0) return parseFloat(pair.priceUsd);
  } catch (e) {}

  // Fallback: Birdeye
  try {
    const res = await fetch(`https://public-api.birdeye.so/defi/price?address=${mint}`, {
      headers: { 'X-API-KEY': process.env.BIRDEYE_API_KEY || '' }
    });
    const data = await res.json();
    if (data?.data?.value > 0) return data.data.value;
  } catch (e) {}

  return 0;
}

// Fetch Meteora DLMM pool reserves via their public API
async function getMeteoraPoolReserves(poolAddress, tokenMint, usdcMint) {
  if (!poolAddress) return { usdc: 0, token: 0 };
  try {
    const res = await fetch(`https://dlmm-api.meteora.ag/pair/${poolAddress}`);
    if (!res.ok) return { usdc: 0, token: 0 };
    const data = await res.json();
    let usdc = 0, token = 0;
    const mintX = data.mint_x;
    const resX = parseInt(data.reserve_x_amount || '0');
    const resY = parseInt(data.reserve_y_amount || '0');
    if (mintX === usdcMint) {
      usdc = resX / 1e6; token = resY / 1e6;
    } else {
      usdc = resY / 1e6; token = resX / 1e6;
    }
    return { usdc, token };
  } catch (e) { return { usdc: 0, token: 0 }; }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN: FETCH ALL DATA FOR A TOKEN AND CALCULATE NAV
// ═══════════════════════════════════════════════════════════════════════

async function fetchTokenData(key, token) {
  // Fire all RPC calls in parallel
  const [
    spot, daoUSDC, futAmmUSDC, onChainSupply,
    futAmmTokens, metAmmTokens, metAmmUSDC,
    lockedTokens, daoTokens, buybackTokens, metaHoldingTokens,
    metPool, metPoolLegacy
  ] = await Promise.all([
    getSpotPrice(token.mint),
    getUSDCBalance(token.usdcMint, token.daoWallet),
    getUSDCBalance(token.usdcMint, token.futAmm),
    getOnChainSupply(token.mint),
    getTokenBalance(token.mint, token.futAmm),
    getVaultBalance(token.metAmm),
    getVaultBalance(token.metAmmUsdc),
    getTokenBalance(token.mint, token.teamLocked),
    getTokenBalance(token.mint, token.daoWallet),
    getTokenBalance(token.mint, token.buybackWallet),
    getTokenBalance(token.mint, META_HOLDING),
    getMeteoraPoolReserves(token.pubMetPool, token.mint, token.usdcMint),
    getMeteoraPoolReserves(token.pubMetPoolLegacy, token.mint, token.usdcMint),
  ]);

  // ── TREASURY USDC ──
  // DAO wallet + Futarchy AMM + Meteora pool USDC
  const metPoolUSDC = metPool.usdc + metPoolLegacy.usdc;
  const metAmmUSDCFinal = Math.max(metAmmUSDC, metPoolUSDC);
  const treasuryUSDC = daoUSDC + futAmmUSDC + metAmmUSDCFinal;

  // ── TOKENS NOT IN HOLDER HANDS ──
  // AMM tokens (locked in pools, can't redeem against treasury)
  const metPoolTokens = metPool.token + metPoolLegacy.token;
  const totalAMM = futAmmTokens + Math.max(metAmmTokens, metPoolTokens);

  // Investor vesting (RNGR has VC tokens that unlock monthly)
  let investorLocked = 0;
  if (token.investorVesting) {
    const v = token.investorVesting;
    const monthsElapsed = Math.floor(
      (Date.now() - new Date(v.tge).getTime()) / (30.44 * 24 * 60 * 60 * 1000)
    );
    const unlocked = Math.min(v.total, (v.total / v.months) * Math.min(monthsElapsed, v.months));
    investorLocked = Math.max(0, v.total - unlocked);
  }

  // ── EFFECTIVE SUPPLY (holder supply) ──
  // Total minted - locked team - AMM tokens - DAO-held - buyback - MetaDAO multisig - investor locked
  const totalSupply = onChainSupply > 0 ? onChainSupply : 0;
  const effectiveSupply = Math.max(1,
    totalSupply - lockedTokens - totalAMM - daoTokens - buybackTokens - metaHoldingTokens - investorLocked
  );

  // ── NAV ──
  const nav = treasuryUSDC / effectiveSupply;

  return {
    token: key,
    ticker: token.ticker,
    spot: round(spot, 6),
    treasuryUSDC: round(treasuryUSDC, 2),
    onChainSupply: Math.round(onChainSupply),
    lockedTokens: Math.round(lockedTokens),
    ammTokens: Math.round(totalAMM),
    futAmmTokens: Math.round(futAmmTokens),
    metAmmTokens: Math.round(Math.max(metAmmTokens, metPoolTokens)),
    daoTokens: Math.round(daoTokens),
    buybackTokens: Math.round(buybackTokens),
    metaHoldingTokens: Math.round(metaHoldingTokens),
    investorLocked: Math.round(investorLocked),
    effectiveSupply: Math.round(effectiveSupply),
    nav: round(nav, 6),
    daoUSDC: round(daoUSDC, 2),
    futAmmUSDC: round(futAmmUSDC, 2),
    metAmmUSDC: round(metAmmUSDCFinal, 2),
    monthlyAllowance: token.monthlyAllowance || 0,
    timestamp: new Date().toISOString(),
  };
}

function round(n, decimals) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

module.exports = { TOKENS, fetchTokenData };
