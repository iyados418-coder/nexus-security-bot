const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');
const AntiRaid = require('../security/antiRaid');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    AntiRaid.check(member, client);
    try {
      const s = getGuildSettings(member.guild.id);
      if (!s.memberLogs) return;
      const ch = member.guild.channels.cache.get(s.memberLogs);
      if (!ch) return;
      const age = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
      const e = new EmbedBuilder()
        .setColor(config.colors.success).setTitle('📥 Member Joined')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 4096 }))
        .setDescription(`${member.user} joined the server`)
        .addFields(
          { name: '👤 User', value: `${member.user.tag}`, inline: true },
          { name: 'ID', value: `\`${member.user.id}\``, inline: true },
          { name: '🕐 Account', value: `<t:${Math.floor(member.user.createdTimestamp/1000)}:R> (${age}d)`, inline: true },
          { name: 'Members', value: `${member.guild.memberCount}`, inline: true }
        )
        .setFooter({ text: `🛡️ Security Bot • Join • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [e] });
      if (global.emitWS) global.emitWS(member.guild.id, 'join', { description: `${member.user.tag} joined the server`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), memberCount: member.guild.memberCount });
      Logger.info(`Join: ${member.user.tag} in ${member.guild.name}`);
    } catch (e) { Logger.error('Join log error', { error: e.message }); }
  }
};
