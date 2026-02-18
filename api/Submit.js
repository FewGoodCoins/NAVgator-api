const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://cxerugkxccbxtiucyvya.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const b = req.body;

    // Validate required fields
    if (!b.name || !b.ticker || !b.mint || !b.daoWallet || !b.icoPrice || !b.twitter || !b.futAmm || !b.pubMetPool || !b.monthlyAllowance || !b.tgeDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate mint address format (basic Solana address check)
    if (b.mint.length < 32 || b.mint.length > 50) {
      return res.status(400).json({ error: 'Invalid mint address format' });
    }

    const trim = (v) => v ? v.trim() : null;
    const num = (v) => v ? parseFloat(v) : null;
    const int = (v) => v ? parseInt(v) : null;

    const submission = {
      name: b.name.trim(),
      ticker: b.ticker.trim().toUpperCase(),
      mint: b.mint.trim(),
      logo: trim(b.logo),
      dao_wallet: b.daoWallet.trim(),
      fut_amm: b.futAmm.trim(),
      pub_met_pool: b.pubMetPool.trim(),
      met_amm: trim(b.metAmm),
      met_amm_usdc: trim(b.metAmmUsdc),
      pub_met_pool_legacy: trim(b.pubMetPoolLegacy),
      team_locked: trim(b.teamLocked),
      buyback_wallet: trim(b.buybackWallet),
      additional_wallets: trim(b.additionalWallets),
      ico_price: parseFloat(b.icoPrice) || 0,
      tge_date: b.tgeDate || null,
      monthly_allowance: num(b.monthlyAllowance),
      raised: num(b.raised),
      total_supply: num(b.totalSupply),
      investor_vesting_total: num(b.investorVestingTotal),
      investor_vesting_months: int(b.investorVestingMonths),
      investor_vesting_tge: b.investorVestingTge || null,
      twitter: b.twitter.trim(),
      website: trim(b.website),
      contact: trim(b.contact),
      notes: trim(b.notes),
      status: 'pending',
      submitted_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('token_submissions')
      .insert([submission]);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save submission' });
    }

    return res.status(200).json({ success: true, message: 'Token submitted for review' });

  } catch (err) {
    console.error('Submit error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
