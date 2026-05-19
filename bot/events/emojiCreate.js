const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'emojiCreate',
  async execute(emoji, client) {
    try {
      if (!emoji.guild) return;
      const s = getGuildSettings(emoji.guild.id);
      if (!s.securityLogs) return;
      const ch = emoji.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      let creator = 'Unknown';
      try { const logs = await emoji.guild.fetchAuditLogs({ type: 60, limit: 1 }); const e = logs.entries.first(); if (e && (Date.now() - e.createdTimestamp) < 5000) creator = e.executor; } catch {}
      const embed = new EmbedBuilder().setColor(config.colors.success).setTitle('😀 Emoji Created')
        .setThumbnail(emoji.url).addFields(
          { name: 'Emoji', value: `${emoji} \`:${emoji.name}:\``, inline: true },
          { name: 'ID', value: `\`${emoji.id}\``, inline: true },
          { name: 'Animated', value: emoji.animated ? 'Yes' : 'No', inline: true },
          { name: '🛠️ By', value: `${creator}`, inline: true }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [embed] });
      const creatorUser = typeof creator === 'object' ? creator : null;
      if (global.emitWS) global.emitWS(emoji.guild.id, 'security', { description: `Emoji :${emoji.name}: created`, emoji: emoji.name, emojiUrl: emoji.url, creator: creatorUser?.tag || creator, modId: creatorUser?.id, modTag: creatorUser?.tag, modAvatar: creatorUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'emojiCreate' });
    } catch (e) { Logger.error('Emoji create log error', { error: e.message }); }
  }
};
