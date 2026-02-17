const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  try {
    // Get last 7 days of snapshots
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('nav_snapshots')
      .select('token, spot, nav, created_at')
      .gte('created_at', since)
      .gt('spot', 0)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Group by token, downsample to ~60 points per token
    const byToken = {};
    for (const row of data) {
      if (!byToken[row.token]) byToken[row.token] = [];
      byToken[row.token].push({
        t: Math.floor(new Date(row.created_at).getTime() / 1000),
        p: row.spot,
        n: row.nav,
      });
    }

    // Downsample: take every Nth point to get ~60 data points
    const sparklines = {};
    for (const [token, points] of Object.entries(byToken)) {
      if (points.length <= 60) {
        sparklines[token] = points;
      } else {
        const step = Math.floor(points.length / 60);
        const sampled = [];
        for (let i = 0; i < points.length; i += step) {
          sampled.push(points[i]);
        }
        // Always include the last point
        if (sampled[sampled.length - 1] !== points[points.length - 1]) {
          sampled.push(points[points.length - 1]);
        }
        sparklines[token] = sampled;
      }
    }

    return res.status(200).json({ sparklines });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
