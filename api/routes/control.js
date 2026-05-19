const router = require('express').Router();
const auth = require('../middleware/auth');
const path = require('path');
const SettingsManager = require('../../bot/utils/settings');

// Bot's status in a specific guild
router.get('/:guildId/status', auth, (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const me = guild.members.me;
    res.json({
      connected: true,
      botTag: client.user?.tag || 'Unknown',
      botId: client.user?.id,
      botAvatar: client.user?.displayAvatarURL({ dynamic: true, size: 256 }),
      permissions: me?.permissions?.toArray() || [],
      joinedAt: me?.joinedAt,
      ping: client.ws.ping,
      uptime: Math.floor(process.uptime()),
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Restart bot connection for a guild (re-fetch)
router.post('/:guildId/restart', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    await guild.members.fetch();
    await guild.channels.fetch();
    await guild.roles.fetch();

    if (global.emitWS) global.emitWS(req.params.guildId, 'info', { description: `Bot connection refreshed by ${req.user.username}`, type: 'reconnect', source: 'dashboard' });
    res.json({ success: true, message: 'Bot connection refreshed' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Toggle lockdown mode
router.post('/:guildId/lockdown', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const isLocked = !!SettingsManager.get(req.params.guildId)?.lockdown;
    SettingsManager.update(req.params.guildId, { lockdown: !isLocked });

    if (global.emitWS) global.emitWS(req.params.guildId, 'security', {
      description: `Server ${isLocked ? 'unlocked' : 'locked down'} by ${req.user.username}`,
      type: isLocked ? 'unlock' : 'lockdown',
      moderator: req.user.username,
      source: 'dashboard',
    });
    res.json({ success: true, lockdown: !isLocked, message: isLocked ? 'Lockdown disabled' : 'Emergency lockdown activated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reload bot commands
router.post('/:guildId/reload-commands', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    if (client.commands?.size) {
      const fs = require('fs');
      const commandsPath = path.join(__dirname, '..', '..', 'bot', 'commands');
      if (fs.existsSync(commandsPath)) {
        const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
        for (const file of files) {
          try {
            const cmd = require(path.join(commandsPath, file));
            if (cmd?.data?.name) {
              client.commands.set(cmd.data.name, cmd);
            }
          } catch (e) { continue; }
        }
      }
    }

    if (global.emitWS) global.emitWS(req.params.guildId, 'info', { description: `Bot commands reloaded by ${req.user.username}`, type: 'reload', source: 'dashboard' });
    res.json({ success: true, message: 'Commands reloaded' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Audit log entries
router.get('/:guildId/audit', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    let entries = [];
    try {
      const auditLog = await guild.fetchAuditLogs({ limit: 20 });
      entries = auditLog.entries.map(e => ({
        id: e.id,
        action: e.action,
        targetId: e.target?.id,
        targetTag: e.target?.tag,
        executorId: e.executor?.id,
        executorTag: e.executor?.tag,
        reason: e.reason,
        createdAt: e.createdAt,
        changes: e.changes?.map(c => ({ key: c.key, old: c.old, new: c.new })),
      }));
    } catch {}

    res.json({ entries });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Test event — emit a sample log to verify WebSocket works
router.post('/:guildId/test-log', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const types = ['security', 'moderation', 'voice', 'join', 'member', 'info'];
    const type = req.body.type || types[Math.floor(Math.random() * types.length)];
    const sampleData = {
      security: { description: `Test security alert — channel monitoring active`, action: 'testAlert', userId: '123456789', userTag: 'TestUser#0000', username: 'TestUser', userAvatar: 'https://cdn.discordapp.com/embed/avatars/0.png', channel: 'general', channelId: '123' },
      moderation: { description: `Test moderation action — member warned`, action: 'warn', userId: '123456789', userTag: 'TestUser#0000', username: 'TestUser', userAvatar: 'https://cdn.discordapp.com/embed/avatars/1.png', moderator: req.user.username, modTag: req.user.username, reason: 'Test reason from dashboard' },
      voice: { description: `Test voice event — user joined voice channel`, action: 'join', userId: '123456789', userTag: 'TestUser#0000', username: 'TestUser', userAvatar: 'https://cdn.discordapp.com/embed/avatars/2.png', channel: 'General Voice', channelId: '456' },
      join: { description: `Test join — new member arrived`, action: 'join', userId: '123456789', userTag: 'TestUser#0000', username: 'TestUser', userAvatar: 'https://cdn.discordapp.com/embed/avatars/3.png', memberCount: 100 },
      member: { description: `Test member update — role added`, action: 'roleAdd', userId: '123456789', userTag: 'TestUser#0000', username: 'TestUser', userAvatar: 'https://cdn.discordapp.com/embed/avatars/4.png', role: 'Moderator', roleId: '789', moderator: req.user.username, modTag: req.user.username },
      info: { description: `Test info — system check passed`, action: 'systemCheck' },
    };

    const data = sampleData[type] || sampleData.info;
    data.source = 'test';

    if (global.emitWS) global.emitWS(req.params.guildId, type, data);
    res.json({ success: true, type, message: `Test ${type} event sent` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reconnect websocket
router.post('/:guildId/reconnect-ws', auth, async (req, res) => {
  try {
    const ws = require('../../websocket/index');
    const io = ws.getIO();
    if (io) {
      io.emit('reconnect', { guildId: req.params.guildId });
    }
    if (global.emitWS) global.emitWS(req.params.guildId, 'info', { description: `WebSocket reconnected by ${req.user.username}`, type: 'reconnect', source: 'dashboard' });
    res.json({ success: true, message: 'WebSocket reconnection triggered' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Sync server data (re-fetch all)
router.post('/:guildId/sync', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    await guild.members.fetch();
    await guild.channels.fetch();
    await guild.roles.fetch();

    if (global.emitWS) global.emitWS(req.params.guildId, 'info', { description: `Server synced by ${req.user.username}`, type: 'sync', source: 'dashboard' });
    res.json({ success: true, message: 'Server data synchronized' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Reload voice cache
router.post('/:guildId/reload-voice', auth, async (req, res) => {
  try {
    const client = global.botClient;
    const guild = client?.guilds?.cache?.get(req.params.guildId);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    await guild.channels.fetch();
    const voiceChannels = guild.channels.cache.filter(c => c.type === 2);
    for (const [id, ch] of voiceChannels) {
      await ch.fetch().catch(() => {});
    }

    if (global.emitWS) global.emitWS(req.params.guildId, 'voice', { description: `Voice cache reloaded by ${req.user.username}`, type: 'voiceReload', source: 'dashboard' });
    res.json({ success: true, message: `Voice cache reloaded (${voiceChannels.size} channels)` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
