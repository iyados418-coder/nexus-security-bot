const { PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const { executeEscalatedAction, hasExemptRole } = require('../utils/actionExecutor');

module.exports = {
  async check(channel, client) {
    channel.guild.fetchAuditLogs({ type: 12, limit: 1 }).then(async audit => {
      const entry = audit.entries.first();
      if (!entry || entry.executor.bot) return;
      const member = channel.guild.members.cache.get(entry.executor.id);
      if (!member || member.permissions.has(PermissionFlagsBits.Administrator)) return;

      const settings = getGuildSettings(channel.guild.id);
      if (!settings.antiMassChannel) return;
      if (hasExemptRole(member, settings.antiMassChannel_exemptRoles)) return;

      const key = `${channel.guild.id}-${entry.executor.id}`;
      const now = Date.now();
      if (!client.channelDeleteTracker.has(key)) client.channelDeleteTracker.set(key, []);
      const deletes = client.channelDeleteTracker.get(key).filter(t => t > now - 10000);
      deletes.push(now);
      client.channelDeleteTracker.set(key, deletes);

      if (deletes.length > 3) {
        await executeEscalatedAction(channel.guild, member, 'antiMassChannel',
          `Auto-Mod: Mass channel deletion (${deletes.length} channels)`,
          { channel, logData: { userId: entry.executor.id, userTag: entry.executor.tag, username: entry.executor.username, userAvatar: entry.executor.displayAvatarURL?.({ dynamic: true, size: 128 }) } });
        Logger.warn(`Anti-Mass-Channel: ${entry.executor.tag}`, { count: deletes.length });
      }
    }).catch(() => {});
  }
};