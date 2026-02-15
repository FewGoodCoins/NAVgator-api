const { createClient } = require('@supabase/supabase-js');
const { TOKENS } = require('./_lib/tokens');

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

  const tokenConfig = TOKENS[token];
  const monthlyAllowance = tokenConfig ? tokenConfig.monthlyAllowance : null;

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
    const allPayments = Object.values(outflowsByDate)
      .map(p => ({ ...p, amount: Math.round(p.amount * 100) / 100 }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Summary stats
    const totalPaidOut = Math.round(outflows.reduce((s, t) => s + parseFloat(t.amount), 0) * 100) / 100;
    const totalReceived = Math.round(inflows.reduce((s, t) => s + parseFloat(t.amount), 0) * 100) / 100;

    // Months in production (first transfer to now)
    const firstDate = new Date(data[0].tx_date);
    const now = new Date();
    const monthsLive = Math.round((now - firstDate) / (30.44 * 86400000) * 10) / 10;

    // --- Smart filtering: separate regular allowance from special payments ---
    // Flag payments > 2x the monthly allowance (if known) as "special"
    // Otherwise use median-based detection
    let regularPayments = allPayments;
    let specialPayments = [];

    if (monthlyAllowance) {
      const threshold = monthlyAllowance * 2;
      regularPayments = allPayments.filter(p => p.amount <= threshold);
      specialPayments = allPayments.filter(p => p.amount > threshold);
    } else {
      // No allowance cap known — use median * 3 as threshold
      const sortedAmounts = allPayments.map(p => p.amount).sort((a, b) => a - b);
      const median = sortedAmounts[Math.floor(sortedAmounts.length / 2)];
      if (median > 0) {
        regularPayments = allPayments.filter(p => p.amount <= median * 3);
        specialPayments = allPayments.filter(p => p.amount > median * 3);
      }
    }

    // Mark special payments
    specialPayments = specialPayments.map(p => ({ ...p, type: 'special' }));
    regularPayments = regularPayments.map(p => ({ ...p, type: 'allowance' }));

    // --- Monthly utilization ---
    // Group regular payments by calendar month
    const monthlySpend = {};
    for (const p of regularPayments) {
      const month = p.date.substring(0, 7); // YYYY-MM
      if (!monthlySpend[month]) monthlySpend[month] = 0;
      monthlySpend[month] += p.amount;
    }

    const months = Object.keys(monthlySpend).sort();
    const utilization = months.map(m => {
      const spent = Math.round(monthlySpend[m] * 100) / 100;
      return {
        month: m,
        spent,
        limit: monthlyAllowance || null,
        utilization: monthlyAllowance ? Math.round(spent / monthlyAllowance * 1000) / 10 : null,
      };
    });

    const avgUtilization = monthlyAllowance && utilization.length > 0
      ? Math.round(utilization.reduce((s, u) => s + u.utilization, 0) / utilization.length * 10) / 10
      : null;

    // --- Schedule detection (using regular payments only) ---
    if (regularPayments.length < 2) {
      return res.status(200).json({
        token,
        monthlyAllowance,
        summary: { totalPaidOut, totalReceived, monthsLive, totalPayments: allPayments.length },
        utilization,
        avgUtilization,
        payments: [...regularPayments, ...specialPayments].sort((a, b) => a.date.localeCompare(b.date)),
        message: 'Not enough regular payments to detect schedule',
      });
    }

    // Merge close payments (within 7 days) into allowance cycles
    const cycles = [];
    let currentCycle = { startDate: regularPayments[0].date, amount: regularPayments[0].amount, payments: 1 };
    for (let i = 1; i < regularPayments.length; i++) {
      const daysBetween = Math.round((new Date(regularPayments[i].date) - new Date(currentCycle.startDate)) / 86400000);
      if (daysBetween <= 7) {
        // Same cycle — accumulate
        currentCycle.amount += regularPayments[i].amount;
        currentCycle.payments++;
      } else {
        // New cycle
        currentCycle.amount = Math.round(currentCycle.amount * 100) / 100;
        cycles.push(currentCycle);
        currentCycle = { startDate: regularPayments[i].date, amount: regularPayments[i].amount, payments: 1 };
      }
    }
    currentCycle.amount = Math.round(currentCycle.amount * 100) / 100;
    cycles.push(currentCycle);

    // Calculate intervals between cycles
    const intervals = [];
    for (let i = 1; i < cycles.length; i++) {
      const d1 = new Date(cycles[i - 1].startDate);
      const d2 = new Date(cycles[i].startDate);
      const daysBetween = Math.round((d2 - d1) / 86400000);
      if (daysBetween > 0) intervals.push(daysBetween);
    }

    // Cycle amount stats
    const cycleAmounts = cycles.map(c => c.amount).sort((a, b) => a - b);
    const medianCycleAmount = cycleAmounts[Math.floor(cycleAmounts.length / 2)];
    const avgCycleAmount = Math.round(cycleAmounts.reduce((s, a) => s + a, 0) / cycleAmounts.length * 100) / 100;

    // Interval stats
    let medianInterval = 30;
    let avgInterval = 30;
    let frequency = 'monthly';
    let consistency = 50;

    if (intervals.length > 0) {
      const sortedIntervals = [...intervals].sort((a, b) => a - b);
      medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
      avgInterval = Math.round(intervals.reduce((s, i) => s + i, 0) / intervals.length * 10) / 10;

      if (medianInterval >= 25 && medianInterval <= 35) frequency = 'monthly';
      else if (medianInterval >= 12 && medianInterval <= 18) frequency = 'biweekly';
      else if (medianInterval >= 5 && medianInterval <= 9) frequency = 'weekly';
      else if (medianInterval >= 55 && medianInterval <= 65) frequency = 'bimonthly';
      else if (medianInterval >= 85 && medianInterval <= 95) frequency = 'quarterly';
      else frequency = 'irregular';

      const intervalVariance = intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length;
      consistency = Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(intervalVariance) * 5)));
    }

    // Predict next payment
    const lastCycle = cycles[cycles.length - 1];
    const lastCycleDate = new Date(lastCycle.startDate);
    const nextDate = new Date(lastCycleDate);
    nextDate.setDate(nextDate.getDate() + medianInterval);
    const daysUntilNext = Math.round((nextDate - now) / 86400000);
    const daysSinceLast = Math.round((now - lastCycleDate) / 86400000);

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    res.status(200).json({
      token,
      monthlyAllowance,
      summary: {
        totalPaidOut,
        totalReceived,
        monthsLive,
        totalPayments: allPayments.length,
        avgPaymentPerMonth: Math.round(totalPaidOut / Math.max(monthsLive, 1) * 100) / 100,
      },
      schedule: {
        frequency,
        intervalDays: medianInterval,
        avgIntervalDays: avgInterval,
        typicalAmount: medianCycleAmount,
        avgAmount: avgCycleAmount,
        consistency,
      },
      lastPayment: {
        date: lastCycle.startDate,
        amount: lastCycle.amount,
        daysAgo: daysSinceLast,
      },
      nextPredicted: {
        date: nextDate.toISOString().split('T')[0],
        estimatedAmount: medianCycleAmount,
        daysUntil: daysUntilNext,
        overdue: daysUntilNext < 0,
      },
      utilization,
      avgUtilization,
      cycles,
      specialPayments: specialPayments.length > 0 ? specialPayments : undefined,
      intervals,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
