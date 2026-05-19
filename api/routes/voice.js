const router = require('express').Router();
const auth = require('../middleware/auth');
const { PermissionFlagsBits } = require('discord.js');

// Get all voice channels with connected members
router.get('/:guildId', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const voiceChannels = guild.channels.cache.filter(c => c.type === 2);
    const data = voiceChannels.map(ch => ({
      id: ch.id,
      name: ch.name,
      bitrate: ch.bitrate,
      userLimit: ch.userLimit,
      members: ch.members.map(m => ({
        id: m.user.id,
        username: m.user.username,
        displayName: m.displayName,
        avatar: m.user.displayAvatarURL({ dynamic: true, size: 128 }),
        bot: m.user.bot,
        mute: m.voice.mute,
        deaf: m.voice.deaf,
        selfMute: m.voice.selfMute,
        selfDeaf: m.voice.selfDeaf,
        streaming: m.voice.streaming,
        camera: m.voice.selfVideo,
        suppress: m.voice.suppress,
      })),
    }));

    res.json({ channels: data, total: voiceChannels.reduce((s, c) => s + c.members.size, 0) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Disconnect user from voice
router.post('/:guildId/disconnect', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const member = guild.members.cache.get(userId);
    if (!member || !member.voice.channelId) return res.status(404).json({ error: 'Member not in voice' });

    await member.voice.disconnect(`[Dashboard] Disconnected by ${req.user.username}`);
    if (global.emitWS) global.emitWS(req.params.guildId, 'voice', { description: `${userId} was disconnected from voice by ${req.user.username}`, user: userId, moderator: req.user.username, type: 'disconnect', source: 'dashboard' });
    res.json({ success: true, action: 'disconnect', userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Server mute user in voice
router.post('/:guildId/mute', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, state } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const member = guild.members.cache.get(userId);
    if (!member || !member.voice.channelId) return res.status(404).json({ error: 'Member not in voice' });

    await member.voice.setMute(state !== false, `[Dashboard] ${state !== false ? 'Muted' : 'Unmuted'} by ${req.user.username}`);
    if (global.emitWS) global.emitWS(req.params.guildId, 'voice', { description: `${userId} was ${state !== false ? 'server muted' : 'unmuted'} by ${req.user.username}`, user: userId, moderator: req.user.username, type: state !== false ? 'mute' : 'unmute', source: 'dashboard' });
    res.json({ success: true, action: state !== false ? 'mute' : 'unmute', userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Server deafen user in voice
router.post('/:guildId/deafen', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, state } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const member = guild.members.cache.get(userId);
    if (!member || !member.voice.channelId) return res.status(404).json({ error: 'Member not in voice' });

    await member.voice.setDeaf(state !== false, `[Dashboard] ${state !== false ? 'Deafened' : 'Undeafened'} by ${req.user.username}`);
    if (global.emitWS) global.emitWS(req.params.guildId, 'voice', { description: `${userId} was ${state !== false ? 'server deafened' : 'undeafened'} by ${req.user.username}`, user: userId, moderator: req.user.username, type: state !== false ? 'deafen' : 'undeafen', source: 'dashboard' });
    res.json({ success: true, action: state !== false ? 'deafen' : 'undeafen', userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Move user to another voice channel
router.post('/:guildId/move', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, channelId } = req.body;
    if (!userId || !channelId) return res.status(400).json({ error: 'userId and channelId required' });

    const member = guild.members.cache.get(userId);
    if (!member || !member.voice.channelId) return res.status(404).json({ error: 'Member not in voice' });

    const targetChannel = guild.channels.cache.get(channelId);
    if (!targetChannel || targetChannel.type !== 2) return res.status(400).json({ error: 'Invalid voice channel' });

    await member.voice.setChannel(channelId, `[Dashboard] Moved by ${req.user.username}`);
    if (global.emitWS) global.emitWS(req.params.guildId, 'voice', { description: `${userId} was moved to ${targetChannel.name} by ${req.user.username}`, user: userId, moderator: req.user.username, type: 'move', source: 'dashboard', channelName: targetChannel.name });
    res.json({ success: true, action: 'move', userId, channelId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Timeout a voice member
router.post('/:guildId/timeout', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, duration } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const member = guild.members.cache.get(userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const ms = (parseInt(duration) || 60) * 60 * 1000;
    await member.timeout(ms, `[Dashboard] Timed out by ${req.user.username}`);

    if (global.emitWS) global.emitWS(req.params.guildId, 'moderation', { description: `${userId} timed out by ${req.user.username}`, user: userId, moderator: req.user.username, type: 'timeout', duration, source: 'dashboard' });
    res.json({ success: true, action: 'timeout', userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Warn a voice member
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
    warns[userId].push({ moderator: req.user.username, moderatorId: req.user.id, reason: reason || 'Voice warning', date: new Date().toISOString(), guildId: req.params.guildId });
    fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));

    if (global.emitWS) global.emitWS(req.params.guildId, 'moderation', { description: `${userId} warned by ${req.user.username}`, user: userId, moderator: req.user.username, type: 'warn', reason: reason || '', source: 'dashboard' });
    res.json({ success: true, action: 'warn', userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Kick a voice member
router.post('/:guildId/kick', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const member = guild.members.cache.get(userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    await member.kick(`[Dashboard] ${req.user.username}: ${reason || 'Kicked from voice'}`);
    if (global.emitWS) global.emitWS(req.params.guildId, 'moderation', { description: `${userId} kicked by ${req.user.username}`, user: userId, moderator: req.user.username, type: 'kick', reason: reason || '', source: 'dashboard' });
    res.json({ success: true, action: 'kick', userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Ban a voice member
router.post('/:guildId/ban', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const { userId, reason } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    await guild.members.ban(userId, { reason: `[Dashboard] ${req.user.username}: ${reason || 'Banned from voice'}`, deleteMessageSeconds: 86400 });
    if (global.emitWS) global.emitWS(req.params.guildId, 'moderation', { description: `${userId} banned by ${req.user.username}`, user: userId, moderator: req.user.username, type: 'ban', reason: reason || '', source: 'dashboard' });
    res.json({ success: true, action: 'ban', userId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
