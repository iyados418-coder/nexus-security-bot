const router = require('express').Router();
const auth = require('../middleware/auth');

// Get bot stats for a guild
router.get('/:guildId', auth, (req, res) => {
  const client = global.botClient;
  const guild = client?.guilds?.cache?.get(req.params.guildId);
  if (!guild) return res.status(404).json({ error: 'Guild not found' });

  const botMember = guild.members.me;
  const channels = guild.channels.cache;
  const voiceChannels = channels.filter(c => c.type === 2);

  res.json({
    guild: { name: guild.name, id: guild.id, icon: guild.iconURL() },
    members: { total: guild.memberCount, online: guild.members.cache.filter(m => m.presence?.status === 'online').size, bots: guild.members.cache.filter(m => m.user.bot).size },
    channels: { total: channels.size, text: channels.filter(c => c.type === 0).size, voice: voiceChannels.size },
    roles: guild.roles.cache.size,
    boosts: guild.premiumSubscriptionCount || 0,
    bot: { ping: client.ws.ping, uptime: Math.floor(process.uptime()), servers: client.guilds.cache.size },
    voice: { active: voiceChannels.reduce((sum, c) => sum + c.members.size, 0) },
  });
});

// Get global bot stats
router.get('/', (req, res) => {
  const client = global.botClient;
  if (!client) return res.json({ status: 'offline' });

  let totalMembers = 0;
  client.guilds.cache.forEach(g => totalMembers += g.memberCount);

  res.json({
    status: 'online',
    user: { tag: client.user.tag, id: client.user.id, avatar: client.user.displayAvatarURL() },
    stats: { servers: client.guilds.cache.size, users: totalMembers, channels: client.channels.cache.size, ping: client.ws.ping, uptime: Math.floor(process.uptime()) },
    commands: client.commands?.size || 0,
  });
});

module.exports = router;
