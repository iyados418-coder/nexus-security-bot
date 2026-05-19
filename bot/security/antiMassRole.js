const { PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const { executeEscalatedAction, hasExemptRole } = require('../utils/actionExecutor');

module.exports = {
  async check(guild, client) {
    guild.fetchAuditLogs({ type: 33, limit: 1 }).then(async audit => {
      const entry = audit.entries.first();
      if (!entry || entry.executor.bot) return;
      const member = guild.members.cache.get(entry.executor.id);
      if (!member || member.permissions.has(PermissionFlagsBits.Administrator)) return;

      const settings = getGuildSettings(guild.id);
      if (!settings.antiMassRole) return;
      if (hasExemptRole(member, settings.antiMassRole_exemptRoles)) return;

      const key = `${guild.id}-${entry.executor.id}`;
      const now = Date.now();
      if (!client.roleDeleteTracker.has(key)) client.roleDeleteTracker.set(key, []);
      const deletes = client.roleDeleteTracker.get(key).filter(t => t > now - 10000);
      deletes.push(now);
      client.roleDeleteTracker.set(key, deletes);

      if (deletes.length > 3) {
        await executeEscalatedAction(guild, member, 'antiMassRole',
          `Auto-Mod: Mass role deletion (${deletes.length} roles)`,
          { logData: { userId: entry.executor.id, userTag: entry.executor.tag, username: entry.executor.username, userAvatar: entry.executor.displayAvatarURL?.({ dynamic: true, size: 128 }) } });
        Logger.warn(`Anti-Mass-Role: ${entry.executor.tag}`, { count: deletes.length });
      }
    }).catch(() => {});
  }
};