const { PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const { executeEscalatedAction, hasExemptRole } = require('../utils/actionExecutor');

module.exports = {
  async check(channel, client) {
    channel.guild.fetchAuditLogs({ type: 50, limit: 1 }).then(async audit => {
      const entry = audit.entries.first();
      if (!entry || entry.executor.bot) return;
      const member = channel.guild.members.cache.get(entry.executor.id);
      if (!member || member.permissions.has(PermissionFlagsBits.Administrator)) return;

      const settings = getGuildSettings(channel.guild.id);
      if (!settings.antiWebhookSpam) return;
      if (hasExemptRole(member, settings.antiWebhookSpam_exemptRoles)) return;

      const key = `${channel.guild.id}-${entry.executor.id}`;
      const now = Date.now();
      if (!client.webhookTracker.has(key)) client.webhookTracker.set(key, []);
      const hooks = client.webhookTracker.get(key).filter(t => t > now - 60000);
      hooks.push(now);
      client.webhookTracker.set(key, hooks);

      if (hooks.length > 2) {
        await executeEscalatedAction(channel.guild, member, 'antiWebhookSpam',
          `Auto-Mod: Webhook spam (${hooks.length} webhooks in 1m)`,
          { timeoutMs: 600000, channel, logData: { userId: entry.executor.id, userTag: entry.executor.tag, username: entry.executor.username, userAvatar: entry.executor.displayAvatarURL?.({ dynamic: true, size: 128 }), channel: channel.name, channelId: channel.id } });
        Logger.warn(`Anti-Webhook: ${entry.executor.tag}`, { count: hooks.length });
      }
    }).catch(() => {});
  }
};