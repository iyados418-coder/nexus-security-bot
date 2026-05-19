const router = require('express').Router();
const auth = require('../middleware/auth');
const SettingsManager = require('../../bot/utils/settings');

// Get all user's guilds (from session, enriched with bot's cached data)
router.get('/', auth, (req, res) => {
  const client = global.botClient;
  const guilds = (req.user.guilds || []).map(g => {
    const botGuild = client?.guilds?.cache?.get(g.id);
    if (botGuild) {
      return { ...g, memberCount: botGuild.memberCount };
    }
    return g;
  });
  res.json({ guilds });
});

// Get guild info
router.get('/:guildId', auth, (req, res) => {
  const client = global.botClient;
  const guild = client?.guilds?.cache?.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const guildData = req.user.guilds?.find(g => g.id === req.params.guildId);
  if (!guildData) return res.status(403).json({ error: 'Not authorized' });

  res.json({
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL({ dynamic: true, size: 4096 }),
    memberCount: guild.memberCount,
    ownerId: guild.ownerId,
    channels: guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type })),
    roles: guild.roles.cache.map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
    members: guild.members.cache.size,
    boosts: guild.premiumSubscriptionCount || 0,
    createdAt: guild.createdAt,
  });
});

// Get guild channels (for settings dropdowns)
router.get('/:guildId/channels', auth, (req, res) => {
  const client = global.botClient;
  const guild = client?.guilds?.cache?.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  const channels = guild.channels.cache
    .filter(c => c.type === 0 || c.type === 2 || c.type === 5)
    .map(c => ({ id: c.id, name: c.name, type: c.type === 2 ? 'voice' : 'text' }));
  res.json({ channels });
});

// Get guild members (for moderation panel) — fetches all members, not just cached
router.get('/:guildId/members', auth, async (req, res) => {
  const client = global.botClient;
  const guild = client?.guilds?.cache?.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });
  try {
    await guild.members.fetch();
  } catch {}
  const members = guild.members.cache.map(m => ({
    id: m.user.id,
    username: m.user.username,
    tag: m.user.tag,
    avatar: m.user.displayAvatarURL({ dynamic: true, size: 256 }),
    nickname: m.nickname,
    roles: m.roles.cache.map(r => ({ id: r.id, name: r.name })),
    joinedAt: m.joinedAt,
    bot: m.user.bot,
    presence: m.presence?.status || 'offline',
  }));
  res.json({ members });
});

module.exports = router;
