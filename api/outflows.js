const { TOKENS } = require('./_lib/tokens');

const HELIUS_RPC = process.env.HELIUS_RPC_URL;
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

function getHeliusApiKey() {
  const match = HELIUS_RPC.match(/api-key=([^&]+)/);
  return match ? match[1] : '';
}

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
      if (sigs.length < 1000) break;
      await new Promise(r => setTimeout(r, 50));
    } catch (e) { break; }
  }
  return allSigs;
}

module.exports = async function handler(req, res) {
  const tokenKey = req.query.token;
  if (!tokenKey || !TOKENS[tokenKey]) {
    return res.status(400).json({ error: 'Invalid ?token=. Use solo/umbra/avici/omfg/rngr.' });
  }

  const token = TOKENS[tokenKey];
  const daoWallet = token.daoWallet;

  // Get all signatures for DAO wallet
  const sigs = await getAllSignatures(daoWallet);
  const sigStrings = sigs.map(s => s.signature);

  // Parse transactions in batches via Helius
  const apiKey = getHeliusApiKey();
  const outflows = [];
  const inflows = [];

  for (let i = 0; i < sigStrings.length; i += 100) {
    const batch = sigStrings.slice(i, i + 100);
    try {
      const resp = await fetch(`https://api.helius.xyz/v0/transactions?api-key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: batch }),
      });
      if (!resp.ok) { await new Promise(r => setTimeout(r, 500)); continue; }
      const txns = await resp.json();
      for (const tx of txns) {
        for (const tt of (tx.tokenTransfers || [])) {
          if (tt.mint !== USDC_MINT) continue;
          const amount = tt.tokenAmount || 0;
          if (amount < 1) continue;
          const date = new Date(tx.timestamp * 1000).toISOString().split('T')[0];
          if (tt.fromUserAccount === daoWallet) {
            outflows.push({
              date,
              timestamp: tx.timestamp,
              amount: Math.round(amount * 100) / 100,
              to: tt.toUserAccount,
              signature: tx.signature,
            });
          } else if (tt.toUserAccount === daoWallet) {
            inflows.push({
              date,
              timestamp: tx.timestamp,
              amount: Math.round(amount * 100) / 100,
              from: tt.fromUserAccount,
              signature: tx.signature,
            });
          }
        }
      }
      await new Promise(r => setTimeout(r, 100));
    } catch (e) { console.error('Parse error:', e.message); }
  }

  outflows.sort((a, b) => a.timestamp - b.timestamp);
  inflows.sort((a, b) => a.timestamp - b.timestamp);

  const totalOut = outflows.reduce((s, o) => s + o.amount, 0);
  const totalIn = inflows.reduce((s, o) => s + o.amount, 0);

  res.status(200).json({
    token: tokenKey,
    daoWallet,
    raise: token.raise,
    totalOutflows: Math.round(totalOut * 100) / 100,
    totalInflows: Math.round(totalIn * 100) / 100,
    netChange: Math.round((totalIn - totalOut) * 100) / 100,
    outflowCount: outflows.length,
    inflowCount: inflows.length,
    outflows,
    inflows,
  });
};
