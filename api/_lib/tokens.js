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

var HELIUS_RPC = process.env.HELIUS_RPC_URL;

async function getTokenBalance(mint, owner) {
  if (!owner || !mint) return 0;
  try {
    var res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'getTokenAccountsByOwner',
        params: [owner, { mint: mint }, { encoding: 'jsonParsed' }],
      }),
    });
    var json = await res.json();
    var total = 0;
    var accounts = (json.result && json.result.value) ? json.result.value : [];
    for (var i = 0; i < accounts.length; i++) {
      var amt = accounts[i].account && accounts[i].account.data && accounts[i].account.data.parsed && accounts[i].account.data.parsed.info && accounts[i].account.data.parsed.info.tokenAmount;
      if (amt) total += amt.uiAmount || 0;
    }
    return total;
  } catch (e) { return 0; }
}

async function getUSDCBalance(usdcMint, owner) {
  return getTokenBalance(usdcMint, owner);
}

async function getOnChainSupply(mint) {
  try {
    var res = await fetch(HELIUS_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenSupply', params: [mint] }),
    });
    var json = await res.json();
    return parseFloat((json.result && json.result.value && json.result.value.uiAmount) || 0);
  } catch (e) { return 0; }
}

async function getSpotPrice(mint) {
  try {
    var res = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + mint);
    var data = await res.json();
    var pair = data.pairs ? data.pairs.find(function(p) { return p.quoteToken && p.quoteToken.symbol === 'USDC'; }) : null;
    return pair ? parseFloat(pair.priceUsd) : 0;
  } catch (e) { return 0; }
}

async function fetchTokenData(key, token) {
  var results = await Promise.all([
    getSpotPrice(token.mint),
    getUSDCBalance(token.usdcMint, token.daoWallet),
    getUSDCBalance(token.usdcMint, token.ammWallet),
    getUSDCBalance(token.usdcMint, token.ammWallet2),
    getOnChainSupply(token.mint),
    getTokenBalance(token.mint, token.ammWallet),
    getTokenBalance(token.mint, token.ammWallet2),
    getTokenBalance(token.mint, token.lockWallet),
  ]);

  var spot = results[0];
  var daoUSDC = results[1], ammUSDC = results[2], amm2USDC = results[3];
  var onChainSupply = results[4];
  var ammTokens = results[5], amm2Tokens = results[6], lockedTokens = results[7];

  var treasuryUSDC = daoUSDC + ammUSDC + amm2USDC;
  var totalAMM = ammTokens + amm2Tokens;
  var totalSupply = onChainSupply > 0 ? onChainSupply : token.supply;
  var effectiveSupply = Math.max(1, totalSupply - lockedTokens - totalAMM);
  var nav = treasuryUSDC / effectiveSupply;

  return {
    token: key,
    ticker: token.ticker,
    spot: spot,
    treasuryUSDC: Math.round(treasuryUSDC * 100) / 100,
    onChainSupply: Math.round(onChainSupply),
    lockedTokens: Math.round(lockedTokens),
    ammTokens: Math.round(totalAMM),
    effectiveSupply: Math.round(effectiveSupply),
    nav: Math.round(nav * 1000000) / 1000000,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { TOKENS: TOKENS, fetchTokenData: fetchTokenData };
