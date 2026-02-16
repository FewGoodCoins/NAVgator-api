const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const data = req.body;

    // Validate required fields
    const required = ['ticker', 'name', 'mint', 'daoWallet', 'futAmm', 'metAmm', 'metAmmUsdc', 'raise', 'tge', 'icoPrice', 'monthlyAllowance', 'supply', 'submitterContact'];
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) {
      return res.status(400).json({ error: 'Missing required fields: ' + missing.join(', ') });
    }

    // Validate Solana addresses (base58, 32-44 chars)
    const addrFields = ['mint', 'daoWallet', 'futAmm', 'metAmm', 'metAmmUsdc'];
    for (const f of addrFields) {
      if (data[f] && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(data[f])) {
        return res.status(400).json({ error: 'Invalid Solana address for ' + f });
      }
    }

    // Optional address fields
    const optionalAddr = ['teamLocked', 'buybackWallet', 'pubMetPool'];
    for (const f of optionalAddr) {
      if (data[f] && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(data[f])) {
        return res.status(400).json({ error: 'Invalid Solana address for ' + f });
      }
    }

    const submission = {
      ticker: data.ticker.toUpperCase().trim(),
      name: data.name.trim(),
      mint: data.mint.trim(),
      usdc_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      dao_wallet: data.daoWallet.trim(),
      fut_amm: data.futAmm.trim(),
      met_amm: data.metAmm.trim(),
      met_amm_usdc: data.metAmmUsdc.trim(),
      team_locked: (data.teamLocked || '').trim() || null,
      buyback_wallet: (data.buybackWallet || '').trim() || null,
      pub_met_pool: (data.pubMetPool || '').trim() || null,
      raise: parseFloat(data.raise),
      supply: parseFloat(data.supply),
      tge: data.tge.trim(),
      ico_price: parseFloat(data.icoPrice),
      monthly_allowance: parseFloat(data.monthlyAllowance),
      logo_url: (data.logoUrl || '').trim() || null,
      submitter_contact: data.submitterContact.trim(),
      notes: (data.notes || '').trim() || null,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('token_submissions')
      .insert(submission);

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to save submission' });
    }

    return res.status(200).json({ success: true, ticker: submission.ticker });
  } catch (err) {
    console.error('Submission error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
