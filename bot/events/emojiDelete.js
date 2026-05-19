const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'emojiDelete',
  async execute(emoji, client) {
    try {
      if (!emoji.guild) return;
      const s = getGuildSettings(emoji.guild.id);
      if (!s.securityLogs) return;
      const ch = emoji.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      let deleter = 'Unknown';
      try { const logs = await emoji.guild.fetchAuditLogs({ type: 62, limit: 1 }); const e = logs.entries.first(); if (e && (Date.now() - e.createdTimestamp) < 5000) deleter = e.executor; } catch {}
      const embed = new EmbedBuilder().setColor(config.colors.error).setTitle('😀 Emoji Deleted')
        .addFields(
          { name: 'Name', value: `:${emoji.name}:`, inline: true },
          { name: 'ID', value: `\`${emoji.id}\``, inline: true },
          { name: '🛠️ By', value: `${deleter}`, inline: true }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [embed] });
      const deleterUser = typeof deleter === 'object' ? deleter : null;
      if (global.emitWS) global.emitWS(emoji.guild.id, 'security', { description: `Emoji :${emoji.name}: deleted`, emoji: emoji.name, deleter: deleterUser?.tag || deleter, modId: deleterUser?.id, modTag: deleterUser?.tag, modAvatar: deleterUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'emojiDelete' });
    } catch (e) { Logger.error('Emoji delete log error', { error: e.message }); }
  }
};
