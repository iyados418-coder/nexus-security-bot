const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'guildBanRemove',
  async execute(ban, client) {
    try {
      const s = getGuildSettings(ban.guild.id);
      if (!s.moderationLogs) return;
      const ch = ban.guild.channels.cache.get(s.moderationLogs);
      if (!ch) return;
      let mod = 'Unknown';
      try { const logs = await ban.guild.fetchAuditLogs({ type: 23, limit: 1 }); const e = logs.entries.first(); if (e?.target.id === ban.user.id && (Date.now() - e.createdTimestamp) < 10000) mod = e.executor; } catch {}
      const embed = new EmbedBuilder().setColor(config.colors.success).setTitle('🔨 Member Unbanned')
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true, size: 4096 }))
        .addFields({ name: '👤 User', value: `${ban.user.tag}`, inline: true }, { name: '🛠️ Moderator', value: `${mod}`, inline: true })
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [embed] });
      const modUser = typeof mod === 'object' ? mod : null;
      if (global.emitWS) global.emitWS(ban.guild.id, 'moderation', { description: `${ban.user.tag} was unbanned by ${mod}`, userId: ban.user.id, userTag: ban.user.tag, userAvatar: ban.user.displayAvatarURL({ dynamic: true, size: 128 }), moderator: modUser?.tag || mod, modId: modUser?.id, modTag: modUser?.tag, modAvatar: modUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'unban' });
    } catch (e) { Logger.error('Unban log error', { error: e.message }); }
  }
};
