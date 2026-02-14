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
    supply: 10000000,
  },
  umbra: {
    ticker: 'UMBRA', name: 'Umbra',
    mint: 'PRVT6TB7uss3FrUd2D9xs2zqDBsa3GbMJMwCQsgmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '6VsC8PuKkXm5xo54c2vbrAaSfQipkpGHqNuKTxXFySx6',
    ammWallet: 'BLkBSE96kQys7SrMioKxeMiVbeo4Ckk2Y4n1JphKxYnv',
    ammWallet2: '7dVri3qjYD3uobSZL3Zth8vSCgU6r6R2nvFsh7uVfDte',
    lockWallet: '3kX3EWm9iPB6oxFS2NJ71L6v5wzFZ8rQMEG6HC8QHJtF',
    supply: 10000000,
  },
  avici: {
    ticker: 'AVICI', name: 'Avicenna',
    mint: 'BANKJmvhT8tiJRsBSS1n2HryMBPvT5Ze4HU95DUAmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: 'DGgYoUcu1aDZt4GEL5NQiducwHRGbkMWsUzsXh2j622G',
    ammWallet: '3D854kknnQhu9xVaRNV154oZ9oN2WF3tXsq3LDu7fFMn',
    ammWallet2: '5gB4NPgFB3MHFHSeKN4sbaY6t9MB8ikCe9HyiKYid4Td',
    supply: 10000000,
  },
  omfg: {
    ticker: 'OMFG', name: 'OMFG',
    mint: 'omfgRBnxHsNJh6YeGbGAmWenNkenzsXyBXm3WDhmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '34rned2SLUcYjUrM9meQkuyJY4QDBcKhkcUPXCgGuXD9',
    ammWallet: '2WNhaB6TPyZ3ynJjAUM4ZZ1Hdeep8FJ3A76FjGjTVjjS',
    ammWallet2: 'BiNnErm2VDkbKGiABj9ZRUjybz879NhH2heeWE7m5M6d',
    supply: 10000000,
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
    supply: 25000000,
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

async function fetchTokenData(key, token) {
  // Fetch all data in parallel
  const [spot, daoUSDC, ammUSDC, amm2USDC, onChainSupply, ammTokens, amm2Tokens, lockedTokens, daoTokens, buybackTokens, multisigTokens] = await Promise.all([
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
  ]);

  const treasuryUSDC = daoUSDC + ammUSDC + amm2USDC;
  const totalAMM = ammTokens + amm2Tokens;
  const totalSupply = onChainSupply > 0 ? onChainSupply : token.supply;
  const effectiveSupply = Math.max(1, totalSupply - lockedTokens - totalAMM - daoTokens - buybackTokens - multisigTokens);
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
    effectiveSupply: Math.round(effectiveSupply),
    nav: Math.round(nav * 1000000) / 1000000,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { TOKENS, fetchTokenData };
