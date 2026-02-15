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
    // Get ALL transfers for this token (both in and out)
    const { data, error } = await supabase
      .from('usdc_transfers')
      .select('amount, tx_date, signature, direction')
      .eq('token', token)
      .order('tx_date', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) {
      return res.status(200).json({ token, message: 'No transfers found' });
    }

    // Separate inflows and outflows
    const inflows = data.filter(d => d.direction === 'in');
    const outflows = data.filter(d => d.direction === 'out');

    // Group outflows by date (combine same-day split payments)
    const outflowsByDate = {};
    for (const t of outflows) {
      const day = t.tx_date.split('T')[0];
      if (!outflowsByDate[day]) outflowsByDate[day] = { date: day, amount: 0, txCount: 0 };
      outflowsByDate[day].amount += parseFloat(t.amount);
      outflowsByDate[day].txCount++;
    }
    const payments = Object.values(outflowsByDate)
      .map(p => ({ ...p, amount: Math.round(p.amount * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Summary stats
    const totalPaidOut = Math.round(outflows.reduce((s, t) => s + parseFloat(t.amount), 0) * 100) / 100;
    const totalReceived = Math.round(inflows.reduce((s, t) => s + parseFloat(t.amount), 0) * 100) / 100;

    // Months in production (first transfer to now)
    const firstDate = new Date(data[0].tx_date);
    const now = new Date();
    const monthsLive = Math.round((now - firstDate) / (30.44 * 86400000) * 10) / 10;

    // Need at least 2 grouped payments to detect pattern
    if (payments.length < 2) {
      return res.status(200).json({
        token,
        summary: { totalPaidOut, totalReceived, monthsLive, totalPayments: payments.length },
        payments,
        message: 'Not enough payments to detect a pattern',
      });
    }

    // Calculate intervals between grouped payments (in days)
    const intervals = [];
    for (let i = 1; i < payments.length; i++) {
      const d1 = new Date(payments[i - 1].date);
      const d2 = new Date(payments[i].date);
      const daysBetween = Math.round((d2 - d1) / 86400000);
      if (daysBetween > 0) intervals.push(daysBetween);
    }

    // Payment amounts
    const amounts = payments.map(p => p.amount).sort((a, b) => a - b);
    const medianAmount = amounts[Math.floor(amounts.length / 2)];
    const avgAmount = Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length * 100) / 100;
    const minAmount = amounts[0];
    const maxAmount = amounts[amounts.length - 1];

    // Interval stats (median)
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

    // Predict next payment
    const lastPayment = payments[payments.length - 1];
    const lastDate = new Date(lastPayment.date);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + medianInterval);

    const daysUntilNext = Math.round((nextDate - now) / 86400000);
    const daysSinceLast = Math.round((now - lastDate) / 86400000);

    // Consistency score
    const intervalVariance = intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length;
    const intervalStdDev = Math.sqrt(intervalVariance);
    const consistency = Math.max(0, Math.min(100, Math.round(100 - intervalStdDev * 5)));

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    res.status(200).json({
      token,
      summary: {
        totalPaidOut,
        totalReceived,
        monthsLive,
        totalPayments: payments.length,
        avgPaymentPerMonth: Math.round(totalPaidOut / Math.max(monthsLive, 1) * 100) / 100,
      },
      schedule: {
        frequency,
        intervalDays: medianInterval,
        avgIntervalDays: avgInterval,
        typicalAmount: medianAmount,
        avgAmount,
        minAmount,
        maxAmount,
        consistency,
      },
      lastPayment: {
        date: lastPayment.date,
        amount: lastPayment.amount,
        daysAgo: daysSinceLast,
      },
      nextPredicted: {
        date: nextDate.toISOString().split('T')[0],
        estimatedAmount: medianAmount,
        daysUntil: daysUntilNext,
        overdue: daysUntilNext < 0,
      },
      payments,
      intervals,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
