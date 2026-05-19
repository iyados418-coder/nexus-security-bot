const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');
const AntiMassRole = require('../security/antiMassRole');

module.exports = {
  name: 'roleDelete',
  async execute(role, client) {
    try {
      if (!role.guild) return;
      AntiMassRole.check(role.guild, client);
      const s = getGuildSettings(role.guild.id);
      if (!s.securityLogs) return;
      const ch = role.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      let deleter = 'Unknown';
      try { const logs = await role.guild.fetchAuditLogs({ type: 33, limit: 1 }); const e = logs.entries.first(); if (e && (Date.now() - e.createdTimestamp) < 5000) deleter = e.executor; } catch {}
      const embed = new EmbedBuilder().setColor(config.colors.error).setTitle('📌 Role Deleted')
        .addFields({ name: 'Role', value: role.name, inline: true }, { name: 'ID', value: `\`${role.id}\``, inline: true }, { name: 'Color', value: role.hexColor, inline: true }, { name: '🛠️ By', value: `${deleter}`, inline: true })
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [embed] });
      const deleterUser = typeof deleter === 'object' ? deleter : null;
      if (global.emitWS) global.emitWS(role.guild.id, 'security', { description: `Role ${role.name} deleted`, role: role.name, roleId: role.id, deleter: deleterUser?.tag || deleter, modId: deleterUser?.id, modTag: deleterUser?.tag, modAvatar: deleterUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'roleDelete' });
    } catch (e) { Logger.error('Role delete log error', { error: e.message }); }
  }
};
