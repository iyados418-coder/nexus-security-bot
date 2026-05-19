const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    try {
      if (message.author?.bot || !message.guild) return;
      const s = getGuildSettings(message.guild.id);
      if (!s.securityLogs) return;
      const ch = message.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      let deleter = 'Unknown';
      try { const logs = await message.guild.fetchAuditLogs({ type: 72, limit: 1 }); const e = logs.entries.first(); if (e && (Date.now() - e.createdTimestamp) < 5000) deleter = e.executor; } catch {}
      const e = new EmbedBuilder().setColor(config.colors.error).setTitle('🗑️ Message Deleted')
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 4096 }))
        .setDescription(`Message deleted in ${message.channel}`)
        .addFields(
          { name: '👤 Author', value: `${message.author.tag}`, inline: true },
          { name: '#️⃣ Channel', value: `${message.channel.name}`, inline: true },
          { name: '🛠️ Deleted By', value: `${deleter}`, inline: true },
          { name: 'Content', value: message.content ? `\`\`\`${message.content.substring(0,1000)}\`\`\`` : '*No text*', inline: false }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      if (message.attachments.size > 0) e.addFields({ name: 'Files', value: `${message.attachments.size} attachment(s)`, inline: true });
      await ch.send({ embeds: [e] });
      const deleterUser = typeof deleter === 'object' ? deleter : null;
      if (global.emitWS) global.emitWS(message.guild.id, 'security', { description: `Message by ${message.author.tag} deleted in #${message.channel.name}`, userId: message.author.id, userTag: message.author.tag, userAvatar: message.author.displayAvatarURL({ dynamic: true, size: 128 }), channel: message.channel.name, channelId: message.channel.id, deleter: deleterUser?.tag || deleter, modId: deleterUser?.id, modTag: deleterUser?.tag, modAvatar: deleterUser?.displayAvatarURL({ dynamic: true, size: 128 }), content: message.content?.substring(0,200), type: 'messageDelete' });
    } catch (e) { Logger.error('Msg delete log error', { error: e.message }); }
  }
};
