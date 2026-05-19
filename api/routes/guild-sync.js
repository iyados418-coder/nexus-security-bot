const router = require('express').Router();
const auth = require('../middleware/auth');

// Get full synced data for a guild (used after guildCreate)
router.get('/:guildId', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    try { await guild.members.fetch(); } catch {}
    try { await guild.channels.fetch(); } catch {}
    try { await guild.roles.fetch(); } catch {}

    const channels = guild.channels.cache.map(c => ({
      id: c.id, name: c.name, type: c.type, parentId: c.parentId,
    }));

    const members = guild.members.cache.map(m => ({
      id: m.user.id,
      username: m.user.username,
      tag: m.user.tag,
      avatar: m.user.displayAvatarURL({ dynamic: true, size: 128 }),
      nickname: m.nickname,
      bot: m.user.bot,
      presence: m.presence?.status || 'offline',
      roles: m.roles.cache.map(r => ({ id: r.id, name: r.name })),
      joinedAt: m.joinedAt,
    }));

    const voiceChannels = guild.channels.cache.filter(c => c.type === 2);
    const voiceMembers = [];
    for (const vc of voiceChannels.values()) {
      for (const m of vc.members.values()) {
        voiceMembers.push({
          id: m.user.id,
          username: m.user.username,
          channelId: vc.id,
          channelName: vc.name,
          mute: m.voice.mute,
          deaf: m.voice.deaf,
          selfMute: m.voice.selfMute,
          selfDeaf: m.voice.selfDeaf,
          streaming: m.voice.streaming,
          camera: m.voice.selfVideo,
        });
      }
    }

    res.json({
      guild: {
        id: guild.id,
        name: guild.name,
        icon: guild.iconURL({ dynamic: true, size: 4096 }),
        memberCount: guild.memberCount,
        ownerId: guild.ownerId,
        createdAt: guild.createdAt,
        boostLevel: guild.premiumTier,
        boosts: guild.premiumSubscriptionCount || 0,
        roles: guild.roles.cache.size,
        channels: channels.length,
        textChannels: channels.filter(c => c.type === 0 || c.type === 5).length,
        voiceChannels: channels.filter(c => c.type === 2).length,
        onlineCount: members.filter(m => m.presence !== 'offline').length,
        botCount: members.filter(m => m.bot).length,
        voiceActive: voiceMembers.length,
      },
      channels,
      members,
      voiceMembers,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
