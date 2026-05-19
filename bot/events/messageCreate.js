const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');
const AntiLink = require('../security/antiLink');
const AntiSpam = require('../security/antiSpam');

const INVITE_RE = /(discord\.(gg|io|me|li)\/[a-zA-Z0-9]+)|(discordapp\.com\/invite\/[a-zA-Z0-9]+)/gi;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;
    const s = getGuildSettings(message.guild.id);

    if (s.antiLink !== false) AntiLink.check(message, client);
    if (s.antiSpam !== false) AntiSpam.check(message, client);

    if (INVITE_RE.test(message.content)) {
      try {
        const invites = await message.guild.invites.fetch().catch(() => null);
        const isOwn = invites ? invites.some(i => message.content.includes(i.code)) : false;
        if (!isOwn) {
          message.delete().catch(() => {});
          if (s.securityLogs) {
            const ch = message.guild.channels.cache.get(s.securityLogs);
            if (ch) {
              const e = new EmbedBuilder().setColor(config.colors.warning).setTitle('🔗 Invite Link Detected')
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true, size: 4096 }))
                .addFields(
                  { name: '👤 User', value: `${message.author.tag}`, inline: true },
                  { name: '#️⃣ Channel', value: `${message.channel.name}`, inline: true },
                  { name: 'Content', value: `\`\`\`${message.content.substring(0,500)}\`\`\``, inline: false }
                )
                .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
              await ch.send({ embeds: [e] });
              if (global.emitWS) global.emitWS(message.guild.id, 'security', { description: `Anti-link: ${message.author.tag} posted invite in #${message.channel.name}`, userId: message.author.id, userTag: message.author.tag, username: message.author.username, userAvatar: message.author.displayAvatarURL({ dynamic: true, size: 128 }), channel: message.channel.name, channelId: message.channel.id, content: message.content.substring(0,200), type: 'antiLink' });
            }
          }
        }
      } catch {}
    }
  }
};
