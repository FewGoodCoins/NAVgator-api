var supabase = require('@supabase/supabase-js');

var db = supabase.createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  var token = req.query.token;
  if (!token) {
    return res.status(400).json({ error: 'Missing ?token= parameter' });
  }

  var numDays = Math.min(parseInt(req.query.days) || 365, 365);
  var since = new Date();
  since.setDate(since.getDate() - numDays);

  try {
    var result = await db
      .from('nav_snapshots')
      .select('spot, treasury_usdc, effective_supply, nav, snapshot_time')
      .eq('token', token)
      .gte('snapshot_time', since.toISOString())
      .order('snapshot_time', { ascending: true });

    if (result.error) {
      return res.status(500).json({ error: result.error.message });
    }

    var byDay = {};
    for (var i = 0; i < result.data.length; i++) {
      var row = result.data[i];
      var day = row.snapshot_time.split('T')[0];
      byDay[day] = row;
    }

    var history = Object.values(byDay).map(function(row) {
      return {
        date: row.snapshot_time,
        spot: row.spot,
        treasury: row.treasury_usdc,
        supply: row.effective_supply,
        nav: row.nav,
      };
    });

    res.status(200).json({
      token: token,
      days: numDays,
      snapshots: history.length,
      history: history,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
