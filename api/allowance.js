const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing ?token= parameter' });

  try {
    // Get all outflows (allowance payments) for this token
    const { data, error } = await supabase
      .from('usdc_transfers')
      .select('amount, tx_date, signature')
      .eq('token', token)
      .eq('direction', 'out')
      .order('tx_date', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length < 2) {
      return res.status(200).json({
        token,
        deposits: data || [],
        message: 'Not enough deposits to detect a pattern (need at least 2)',
      });
    }

    // Format deposits
    const deposits = data.map(d => ({
      date: d.tx_date.split('T')[0],
      amount: parseFloat(d.amount),
      signature: d.signature,
    }));

    // Calculate intervals between deposits (in days)
    const intervals = [];
    for (let i = 1; i < deposits.length; i++) {
      const d1 = new Date(deposits[i - 1].date);
      const d2 = new Date(deposits[i].date);
      const daysBetween = Math.round((d2 - d1) / 86400000);
      if (daysBetween > 0) intervals.push(daysBetween);
    }

    if (intervals.length === 0) {
      return res.status(200).json({
        token,
        deposits,
        message: 'Deposits too close together to detect interval',
      });
    }

    // Median amount
    const amounts = deposits.map(d => d.amount).sort((a, b) => a - b);
    const medianAmount = amounts[Math.floor(amounts.length / 2)];
    const avgAmount = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length * 100) / 100;

    // Median interval
    const sortedIntervals = [...intervals].sort((a, b) => a - b);
    const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
    const avgInterval = Math.round(intervals.reduce((s, i) => s + i, 0) / intervals.length * 10) / 10;

    // Classify frequency
    let frequency = 'irregular';
    if (medianInterval >= 25 && medianInterval <= 35) frequency = 'monthly';
    else if (medianInterval >= 12 && medianInterval <= 18) frequency = 'biweekly';
    else if (medianInterval >= 5 && medianInterval <= 9) frequency = 'weekly';
    else if (medianInterval >= 55 && medianInterval <= 65) frequency = 'bimonthly';
    else if (medianInterval >= 85 && medianInterval <= 95) frequency = 'quarterly';

    // Predict next deposit
    const lastDeposit = deposits[deposits.length - 1];
    const lastDate = new Date(lastDeposit.date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + medianInterval);

    const now = new Date();
    const daysUntilNext = Math.round((nextDate - now) / 86400000);
    const daysSinceLast = Math.round((now - lastDate) / 86400000);

    // Consistency score: how regular are the intervals?
    const intervalVariance = intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const intervalStdDev = Math.sqrt(intervalVariance);
    const consistency = Math.max(0, Math.min(100, Math.round(100 - intervalStdDev * 5)));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    res.status(200).json({
      token,
      schedule: {
        frequency,
        intervalDays: medianInterval,
        avgIntervalDays: avgInterval,
        typicalAmount: medianAmount,
        avgAmount,
        consistency,
      },
      lastDeposit: {
        date: lastDeposit.date,
        amount: lastDeposit.amount,
        daysAgo: daysSinceLast,
      },
      nextPredicted: {
        date: nextDate.toISOString().split('T')[0],
        estimatedAmount: medianAmount,
        daysUntil: daysUntilNext,
        overdue: daysUntilNext < 0,
      },
      totalDeposits: deposits.length,
      deposits,
      intervals,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
