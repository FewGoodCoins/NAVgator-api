var tokens = require('./_lib/tokens');

module.exports = async function handler(req, res) {
  var token = req.query.token;

  try {
    if (token && tokens.TOKENS[token]) {
      var data = await tokens.fetchTokenData(token, tokens.TOKENS[token]);
      return res.status(200).json(data);
    }

    var entries = Object.entries(tokens.TOKENS);
    var promises = entries.map(function(entry) {
      return tokens.fetchTokenData(entry[0], entry[1]).catch(function(e) {
        return { token: entry[0], ticker: entry[1].ticker, error: e.message };
      });
    });
    var results = await Promise.all(promises);

    res.status(200).json({
      tokens: results,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
