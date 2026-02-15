// Shared token configuration and data fetching utilities
const TOKENS = {
  solo: {
    ticker: 'SOLO', name: 'Solomon',
    mint: 'SoLo9oxzLDpcq1dpqAgMwgce5WqkRDtNXK7EPnbmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '98SPcyUZ2rqM2dgjCqqSXS4gJrNTLSNUAAVCF38xYj9u',
    ammWallet: 'DzYtzoNvPbyFCzwZA6cSm9eDEEmxEB9f8AGkJXUXgnSA',
    ammWallet2: '2zsbECzM7roqnDcuv2TNGpfv5PAnuqGmMo5YPtqmUz5p',
    lockWallet: 'Bo24B7DDVtpa9VxZ4LN8FrAT7TM3cgkri41a5GjFg5Dk',
    gtPool: 'o5rJFXSKTsuws58rBMNPG8jdKdnY4Z7ouU29dyohE4g',
    supply: 10000000,
    monthlyAllowance: 100000,
  },
  umbra: {
    ticker: 'UMBRA', name: 'Umbra',
    mint: 'PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '6VsC8PuKkXm5xo54c2vbrAaSfQipkpGHqNuKTxXFySx6',
    ammWallet: 'BLkBSE96kQys7SrMioKxeMiVbeo4Ckk2Y4n1JphKxYnv',
    ammWallet2: '7dVri3qjYD3uobSZL3Zth8vSCgU6r6R2nvFsh7uVfDte',
    lockWallet: '3kX3EWm9iPB6oxFS2NJ71L6v5wzFZ8rQMEG6HC8QHJtF',
    gtPool: '7dVri3qjYD3uobSZL3Zth8vSCgU6r6R2nvFsh7uVfDte',
    gtPoolLegacy: 'BLkBSE96kQys7SrMioKxeMiVbeo4Ckk2Y4n1JphKxYnv',
    supply: 10000000,
    monthlyAllowance: 100000,
  },
  avici: {
    ticker: 'AVICI', name: 'Avicenna',
    mint: 'BANKJmvhT8tiJRsBSS1n2HryMBPvT5Ze4HU95DUAmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: 'DGgYoUcu1aDZt4GEL5NQiducwHRGbkMWsUzsXh2j622G',
    ammWallet: '3D854kknnQhu9xVaRNV154oZ9oN2WF3tXsq3LDu7fFMn',
    ammWallet2: '5gB4NPgFB3MHFHSeKN4sbaY6t9MB8ikCe9HyiKYid4Td',
    gtPool: '5gB4NPgFB3MHFHSeKN4sbaY6t9MB8ikCe9HyiKYid4Td',
    gtPoolLegacy: '3D854kknnQhu9xVaRNV154oZ9oN2WF3tXsq3LDu7fFMn',
    supply: 10000000,
    monthlyAllowance: 100000,
  },
  omfg: {
    ticker: 'OMFG', name: 'OMFG',
    mint: 'omfgRBnxHsNJh6YeGbGAmWenNkenzsXyBXm3WDhmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '34rned2SLUcYjUrM9meQkuyJY4QDBcKhkcUPXCgGuXD9',
    daoUsdcATA: 'Ax6Y8vi4BwoEPjkJp1AkB6RkunEAzF1J356bRrCEJQPf',
    ammWallet: '2WNhaB6TPyZ3ynJjAUM4ZZ1Hdeep8FJ3A76FjGjTVjjS',
    ammWallet2: 'BiNnErm2VDkbKGiABj9ZRUjybz879NhH2heeWE7m5M6d',
    gtPool: 'BiNnErm2VDkbKGiABj9ZRUjybz879NhH2heeWE7m5M6d',
    gtPoolLegacy: '2WNhaB6TPyZ3ynJjAUM4ZZ1Hdeep8FJ3A76FjGjTVjjS',
    supply: 10000000,
    monthlyAllowance: 50000,
  },
  rngr: {
    ticker: 'RNGR', name: 'Ranger',
    mint: 'RNGRtJMbCveqCp7AC6U95KmrdKecFckaJZiWbPGmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '55H1Q1YrHJQ93uhG4jqrBBHx3a8H7TCM8kvf2UM2g5q3',
    ammWallet: '1PAwyDkWNFCcR96GhEReXHJBv3YEFVazCaQgNicVuKv',
    ammWallet2: '59WuweKV7DAg8aUgRhNytScQxioaFYNJdWnox5FxAXFq',
    buybackWallet: '33AEddb7BxoA7Y65BzybFCV5WyGy7LfBdjiL2anCDEkr',
    lockWallet: 'F35JE1HZMtZXXWdy3koSPRe1gGFQyqd5kpbPw2xNcjR8',
    gtPool: '59WuweKV7DAg8aUgRhNytScQxioaFYNJdWnox5FxAXFq',
    gtPoolLegacy: '1PAwyDkWNFCcR96GhEReXHJBv3YEFVazCaQgNicVuKv',
    supply: 25000000,
    investorVesting: { total: 4356250, months: 24, tge: '2026-01-10' },
    monthlyAllowance: 250000,
  },
};

const HELIUS_RPC = process.env.HELIUS_RPC_URL;
const MULTISIG_WALLET = '6awyHMshBGVjJ3ozdSJdyyDE1CTAXUwrpNMaRGMsb4sf';

async function getTokenBalance(mint, owner) {
  if (!owner || !mint) return 0;
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
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

async function getUSDCBalance(usdcMint, owner) {
  return getTokenBalance(usdcMint, owner);
}

async function getOnChainSupply(mint) {
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply', params: [mint] }),
    });
    const json = await res.json();
    return parseFloat(json?.result?.value?.uiAmount || 0);
  } catch (e) { return 0; }
}

async function getSpotPrice(mint) {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    const data = await res.json();
    const pair = data.pairs?.find(p => p.quoteToken?.symbol === 'USDC');
    return pair ? parseFloat(pair.priceUsd) : 0;
  } catch (e) { return 0; }
}

// Fetch Meteora DLMM pool reserves (USDC + token amounts) via their public API
async function getMeteoraPoolReserves(poolAddress, tokenMint, usdcMint) {
  if (!poolAddress) return { usdc: 0, token: 0 };
  try {
    const res = await fetch(`https://dlmm-api.meteora.ag/pair/${poolAddress}`);
    if (!res.ok) return { usdc: 0, token: 0 };
    const data = await res.json();
    // Determine which reserve is USDC and which is the token
    // mint_x and mint_y tell us the token order, reserve_x_amount and reserve_y_amount are raw integers
    let usdc = 0, token = 0;
    const mintX = data.mint_x;
    const mintY = data.mint_y;
    const resX = parseInt(data.reserve_x_amount || '0');
    const resY = parseInt(data.reserve_y_amount || '0');
    if (mintX === usdcMint) {
      usdc = resX / 1e6; // USDC has 6 decimals
      token = resY / 1e6; // MetaDAO tokens also 6 decimals
    } else if (mintY === usdcMint) {
      usdc = resY / 1e6;
      token = resX / 1e6;
    }
    return { usdc, token };
  } catch (e) { return { usdc: 0, token: 0 }; }
}

async function fetchTokenData(key, token) {
  // Fetch all data in parallel — include Meteora pool reserves
  const [spot, daoUSDC, ammUSDC, amm2USDC, onChainSupply, ammTokens, amm2Tokens, lockedTokens, daoTokens, buybackTokens, multisigTokens, meteoraPool, meteoraPoolLegacy] = await Promise.all([
    getSpotPrice(token.mint),
    getUSDCBalance(token.usdcMint, token.daoWallet),
    getUSDCBalance(token.usdcMint, token.ammWallet),
    getUSDCBalance(token.usdcMint, token.ammWallet2),
    getOnChainSupply(token.mint),
    getTokenBalance(token.mint, token.ammWallet),
    getTokenBalance(token.mint, token.ammWallet2),
    getTokenBalance(token.mint, token.lockWallet),
    getTokenBalance(token.mint, token.daoWallet),
    getTokenBalance(token.mint, token.buybackWallet),
    getTokenBalance(token.mint, MULTISIG_WALLET),
    getMeteoraPoolReserves(token.gtPool, token.mint, token.usdcMint),
    getMeteoraPoolReserves(token.gtPoolLegacy, token.mint, token.usdcMint),
  ]);

  // Treasury USDC = DAO wallet + Meteora pool USDC reserves
  // The ammWallet/ammWallet2 RPC calls may return 0 for Meteora pools since USDC
  // is held by the pool program, not the pool address. Meteora API gives accurate reserves.
  // Use the higher of RPC balance vs Meteora reserve to avoid double-counting
  const poolUSDC = meteoraPool.usdc + meteoraPoolLegacy.usdc;
  const rpcAmmUSDC = ammUSDC + amm2USDC;
  const ammUSDCFinal = Math.max(poolUSDC, rpcAmmUSDC);
  const treasuryUSDC = daoUSDC + ammUSDCFinal;

  // AMM tokens from Meteora pool reserves (tokens locked in pool, not eligible for NAV)
  const poolTokens = meteoraPool.token + meteoraPoolLegacy.token;
  const rpcAmmTokens = ammTokens + amm2Tokens;
  const totalAMM = Math.max(poolTokens, rpcAmmTokens);

  const totalSupply = onChainSupply > 0 ? onChainSupply : token.supply;

  // Calculate still-locked investor tokens (monthly unlock, assume sold on unlock)
  let investorLocked = 0;
  if (token.investorVesting) {
    const v = token.investorVesting;
    const monthsElapsed = Math.floor((Date.now() - new Date(v.tge).getTime()) / (30.44 * 24 * 60 * 60 * 1000));
    const unlocked = Math.min(v.total, (v.total / v.months) * Math.min(monthsElapsed, v.months));
    investorLocked = Math.max(0, v.total - unlocked);
  }

  const effectiveSupply = Math.max(1, totalSupply - lockedTokens - totalAMM - daoTokens - buybackTokens - multisigTokens - investorLocked);
  const nav = treasuryUSDC / effectiveSupply;

  return {
    token: key,
    ticker: token.ticker,
    spot,
    treasuryUSDC: Math.round(treasuryUSDC * 100) / 100,
    onChainSupply: Math.round(onChainSupply),
    lockedTokens: Math.round(lockedTokens),
    ammTokens: Math.round(totalAMM),
    daoTokens: Math.round(daoTokens),
    buybackTokens: Math.round(buybackTokens),
    multisigTokens: Math.round(multisigTokens),
    investorLocked: Math.round(investorLocked),
    effectiveSupply: Math.round(effectiveSupply),
    nav: Math.round(nav * 1000000) / 1000000,
    meteoraPoolUSDC: Math.round(poolUSDC * 100) / 100,
    meteoraPoolTokens: Math.round(poolTokens),
    timestamp: new Date().toISOString(),
  };
}

module.exports = { TOKENS, fetchTokenData };
