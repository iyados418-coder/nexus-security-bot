const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMsg, newMsg, client) {
    try {
      if (newMsg.author?.bot || !newMsg.guild || oldMsg.content === newMsg.content) return;
      const s = getGuildSettings(newMsg.guild.id);
      if (!s.securityLogs) return;
      const ch = newMsg.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      const e = new EmbedBuilder().setColor(config.colors.info).setTitle('✏️ Message Edited')
        .setThumbnail(newMsg.author.displayAvatarURL({ dynamic: true, size: 4096 }))
        .addFields(
          { name: '👤 Author', value: `${newMsg.author.tag}`, inline: true },
          { name: '#️⃣ Channel', value: `${newMsg.channel.name}`, inline: true },
          { name: '📝 Old', value: oldMsg.content ? `\`\`\`${oldMsg.content.substring(0,500)}\`\`\`` : '*None*', inline: false },
          { name: '📝 New', value: newMsg.content ? `\`\`\`${newMsg.content.substring(0,500)}\`\`\`` : '*None*', inline: false },
          { name: 'Link', value: `[Jump](${newMsg.url})`, inline: false }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [e] });
      if (global.emitWS) global.emitWS(newMsg.guild.id, 'security', { description: `${newMsg.author.tag} edited message in #${newMsg.channel.name}`, userId: newMsg.author.id, userTag: newMsg.author.tag, userAvatar: newMsg.author.displayAvatarURL({ dynamic: true, size: 128 }), channel: newMsg.channel.name, channelId: newMsg.channel.id, type: 'messageEdit' });
    } catch (e) { Logger.error('Msg edit log error', { error: e.message }); }
  }
};
