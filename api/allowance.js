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
    // Get all snapshots for this token ordered by date
    const { data, error } = await supabase
      .from('nav_snapshots')
      .select('treasury_usdc, snapshot_time')
      .eq('token', token)
      .order('snapshot_time', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length < 2) {
      return res.status(200).json({ token, message: 'Not enough data to detect pattern' });
    }

    // Deduplicate to one per day (keep latest)
    const byDay = {};
    for (const row of data) {
      const day = row.snapshot_time.split('T')[0];
      byDay[day] = row;
    }
    const days = Object.keys(byDay).sort();

    // Detect significant USDC inflows (treasury jumps)
    const inflows = [];
    for (let i = 1; i < days.length; i++) {
      const prev = byDay[days[i - 1]].treasury_usdc;
      const curr = byDay[days[i]].treasury_usdc;
      const diff = curr - prev;
      // Only count inflows > $100 (filter noise)
      if (diff > 100) {
        inflows.push({
          date: days[i],
          amount: Math.round(diff * 100) / 100,
          treasuryBefore: Math.round(prev * 100) / 100,
          treasuryAfter: Math.round(curr * 100) / 100,
        });
      }
    }

    if (inflows.length < 2) {
      return res.status(200).json({
        token,
        inflows,
        message: 'Not enough inflows to detect a pattern (need at least 2)',
      });
    }

    // Calculate intervals between inflows (in days)
    const intervals = [];
    for (let i = 1; i < inflows.length; i++) {
      const d1 = new Date(inflows[i - 1].date);
      const d2 = new Date(inflows[i].date);
      const daysBetween = Math.round((d2 - d1) / 86400000);
      intervals.push(daysBetween);
    }

    // Detect the typical amount (median of inflow amounts)
    const amounts = inflows.map(f => f.amount).sort((a, b) => a - b);
    const medianAmount = amounts[Math.floor(amounts.length / 2)];
    const avgAmount = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length * 100) / 100;

    // Detect the typical interval (median)
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

    // Predict next allowance
    const lastInflow = inflows[inflows.length - 1];
    const lastDate = new Date(lastInflow.date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + medianInterval);

    const now = new Date();
    const daysUntilNext = Math.round((nextDate - now) / 86400000);

    // Confidence: how consistent are the intervals?
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
        consistency, // 0-100, higher = more predictable
      },
      lastDeposit: {
        date: lastInflow.date,
        amount: lastInflow.amount,
        daysAgo: Math.round((now - lastDate) / 86400000),
      },
      nextPredicted: {
        date: nextDate.toISOString().split('T')[0],
        estimatedAmount: medianAmount,
        daysUntil: daysUntilNext,
        overdue: daysUntilNext < 0,
      },
      history: inflows,
      intervals,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
