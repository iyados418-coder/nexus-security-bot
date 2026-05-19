const router = require('express').Router();
const auth = require('../middleware/auth');
const { PermissionFlagsBits } = require('discord.js');

// Ban user via dashboard
router.post('/:guildId/ban', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, reason, deleteDays } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    await guild.members.ban(userId, {
      reason: `[Dashboard] ${req.user.username}: ${reason || 'No reason'}`,
      deleteMessageSeconds: (deleteDays || 0) * 86400,
    });

    if (global.emitWS) global.emitWS(req.params.guildId, 'moderation', { description: `${userId} was banned by ${req.user.username}`, user: userId, moderator: req.user.username, reason: reason || 'No reason', type: 'ban', source: 'dashboard' });
    res.json({ success: true, action: 'ban', userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Kick user via dashboard
router.post('/:guildId/kick', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const member = guild.members.cache.get(userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await member.kick(`[Dashboard] ${req.user.username}: ${reason || 'No reason'}`);
    if (global.emitWS) global.emitWS(req.params.guildId, 'moderation', { description: `${userId} was kicked by ${req.user.username}`, user: userId, moderator: req.user.username, reason: reason || 'No reason', type: 'kick', source: 'dashboard' });
    res.json({ success: true, action: 'kick', userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Timeout user via dashboard
router.post('/:guildId/timeout', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, duration, reason } = req.body;
    if (!userId || !duration) return res.status(400).json({ error: 'userId and duration required' });

    const member = guild.members.cache.get(userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const durationMs = parseDuration(duration);
    if (!durationMs) return res.status(400).json({ error: 'Invalid duration' });

    await member.timeout(durationMs, `[Dashboard] ${req.user.username}: ${reason || 'No reason'}`);
    if (global.emitWS) global.emitWS(req.params.guildId, 'moderation', { description: `${userId} was timed out by ${req.user.username} for ${duration}`, user: userId, moderator: req.user.username, duration, reason: reason || 'No reason', type: 'timeout', source: 'dashboard' });
    res.json({ success: true, action: 'timeout', userId, duration });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Warn user via dashboard
router.post('/:guildId/warn', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const fs = require('fs');
    const path = require('path');
    const warnsFile = path.join(__dirname, '..', '..', 'logs', 'warns.json');
    let warns = {};
    try { warns = JSON.parse(fs.readFileSync(warnsFile, 'utf8')); } catch {}
    if (!warns[userId]) warns[userId] = [];
    warns[userId].push({ moderator: req.user.username, moderatorId: req.user.id, reason: reason || 'No reason', date: new Date().toISOString(), guildId: req.params.guildId });
    fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));

    if (global.emitWS) global.emitWS(req.params.guildId, 'moderation', { description: `${userId} was warned by ${req.user.username}`, user: userId, moderator: req.user.username, reason: reason || 'No reason', type: 'warn', source: 'dashboard' });
    res.json({ success: true, action: 'warn', userId, total: warns[userId].length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

function parseDuration(str) {
  const match = str.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return null;
  const v = parseInt(match[1]);
  switch (match[2].toLowerCase()) {
    case 's': return v * 1000;
    case 'm': return v * 60000;
    case 'h': return v * 3600000;
    case 'd': return v * 86400000;
    default: return null;
  }
}

module.exports = router;
