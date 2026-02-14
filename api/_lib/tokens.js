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
  zkfg: {
    ticker: 'ZKFG', name: 'ZKLSOL',
    mint: 'zkFGH8PVmBeMiF4gYhaEhU4do5ERFxjKUkJJaCKPWCo',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '3N7WBu3yXGF3ryjcr1jxncAvfDrXATBCFzTR3Bnipaht',
    ammWallet: 'Hwxq3p9gspPSefNZz4zBDCuEkiGE4m8TjKTjbhWo2bY4',
    ammWallet2: '6tAmBnuMFPNTBps7hZ9BFcVThqToi5m89KxWJG5r2UyS',
    supply: 10000000,
  },
  umbra: {
    ticker: 'UMBRA', name: 'Umbra',
    mint: 'UMBReKKMwQBDH7KGsXFmFuBmPkN5DuVzP4TDNqhAmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: 'AvWbGMXiiAFqHWnYhFJ3aCeMbusNRrnp8Mcpjrx6cmwN',
    ammWallet: 'Aw7F7NAwq6bNE5kCcoMiMyKhfFBVxMi2htSRtpYBe5vu',
    ammWallet2: '6yHTQiEd17SiE4Vz5FDKyYFxb2e3JKjCSnPr5qgzmeta',
    supply: 10000000,
  },
  avici: {
    ticker: 'AVICI', name: 'Avicenna',
    mint: 'AVCi9LaA7peg6EXZMzB2FT4NKPQQ6sUHLGRZWzmMmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: 'AwiX1WwCbYSFSi2Kh7g2F7gpVNAXueLswn1vp3sCgkVN',
    ammWallet: '7yjBU1VyCYE3k5J6JMY5SYYidibTXq79Dd75ejPtmeta',
    ammWallet2: 'NrLqk7Mgs2RmFPAuDNMHb6fNDnRzgM6V2rbQYBEmeta',
    supply: 10000000,
  },
  loyal: {
    ticker: 'LOYAL', name: 'Loyalty',
    mint: 'LoYALbhBF7oba4Hdb16FpiGM3CZXCP5SE3JFNHJ5meta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: 'DoEMPofR2EGLXkZZKaZR8BrvSCv5GYDPWC1ZthXvSLsF',
    ammWallet: 'AKKnR72ASCC84Ty2qwqpGHwVzNBDLEKAGv5NeKi5meta',
    ammWallet2: '8W9RfMDT5tyLg4KBsu67KVmq4bCEB68b5GFT4mVUmeta',
    buybackWallet: 'BL1iGEJY41nYv1w6LNacYAA3DMhUPxEwC3UXP31pmeta',
    supply: 40000000,
  },
  omfg: {
    ticker: 'OMFG', name: 'OMFG',
    mint: 'OMFG7JJN15FPa3JBMQta4rc5h6TKZbR2gSLnBSmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '6gTvy2YbF4rFiJ9sHT7qVMHeWcqU99Kx3gpQq9AGfmN2',
    ammWallet: 'EMCgJCMpRRR1MZFBbEPaR9QYNWQER9bxCAq1Nxz5meta',
    ammWallet2: '9J4qB6d7oRcF8rQ3HvYkLVKsGvSn3zaXpYs2XPNGmeta',
    supply: 10000000,
  },
  rngr: {
    ticker: 'RNGR', name: 'Ranger',
    mint: 'RNGR7vFJpCNAvXFnmuAfcFBFNfxiRaZ1pkaRvHPmeta',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    daoWallet: '8ZYQ2xKZg4fW7p6hZ3d4vHw4Ey7WAkHFaELzABEbAJgg',
    ammWallet: '4RhbWKsFGvJHmh9Z6875RixhDe3c6KRjCM7PkT9Vmeta',
    ammWallet2: 'AikB1GPZY7LqHUSSj5x7KEV6rnRyEgd5DdJCAFpmeta',
    buybackWallet: 'RPTAxECvv3PB53a3GQE3Bwhsa3xtBNRyJfLLq3Pmeta',
    supply: 25000000,
  },
};

const HELIUS_RPC = process.env.HELIUS_RPC_URL;

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
    const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/' + mint);
    const data = await res.json();
    const pair = data.pairs ? data.pairs.find(function(p) { return p.quoteToken && p.quoteToken.symbol === 'USDC'; }) : null;
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
