const router = require('express').Router();
const auth = require('../middleware/auth');
const logSaver = require('../utils/logSaver');

// Get logs with filtering, search, and pagination
router.get('/:guildId', auth, (req, res) => {
  const client = global.botClient;
  if (!client?.guilds?.cache?.has(req.params.guildId)) return res.status(404).json({ error: 'Guild not found' });

  const guildData = req.user.guilds?.find(g => g.id === req.params.guildId);
  if (!guildData) return res.status(403).json({ error: 'Not authorized' });

  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;

  const result = logSaver.getLogs(req.params.guildId, {
    limit,
    offset,
    startDate: req.query.startDate || undefined,
    endDate: req.query.endDate || undefined,
    type: req.query.type || undefined,
    search: req.query.search || undefined,
  });

  res.json(result);
});

// Get all dates that have logs for a guild
router.get('/:guildId/dates', auth, (req, res) => {
  const client = global.botClient;
  if (!client?.guilds?.cache?.has(req.params.guildId)) return res.status(404).json({ error: 'Guild not found' });

  const guildData = req.user.guilds?.find(g => g.id === req.params.guildId);
  if (!guildData) return res.status(403).json({ error: 'Not authorized' });

  const dates = logSaver.getAvailableDates(req.params.guildId);
  res.json({ dates });
});

module.exports = router;
