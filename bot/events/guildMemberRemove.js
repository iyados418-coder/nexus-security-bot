const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      const s = getGuildSettings(member.guild.id);
      if (!s.memberLogs) return;
      const ch = member.guild.channels.cache.get(s.memberLogs);
      if (!ch) return;
      let isKick = false, kickMod = null;
      try {
        const logs = await member.guild.fetchAuditLogs({ type: 20, limit: 1 });
        const e = logs.entries.first();
        if (e && e.target.id === member.id && (Date.now() - e.createdTimestamp) < 10000) { isKick = true; kickMod = e.executor; }
      } catch {}
      const dur = member.joinedTimestamp ? Math.floor((Date.now() - member.joinedTimestamp) / 86400000) + 'd' : 'Unknown';
      const e = new EmbedBuilder()
        .setColor(config.colors.error).setTitle(isKick ? '👢 Member Kicked' : '📤 Member Left')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 4096 }))
        .setDescription(`${member.user} ${isKick ? 'was kicked' : 'left'}`)
        .addFields(
          { name: '👤 User', value: `${member.user.tag}`, inline: true },
          { name: 'ID', value: `\`${member.user.id}\``, inline: true },
          { name: 'Duration', value: dur, inline: true }
        )
        .setFooter({ text: `🛡️ Security Bot • ${isKick ? 'Kick' : 'Leave'} • ${new Date().toLocaleString()}` }).setTimestamp();
      if (isKick && kickMod) e.addFields({ name: '🛠️ Kicked By', value: `${kickMod.tag}`, inline: true });
      await ch.send({ embeds: [e] });
      if (global.emitWS) global.emitWS(member.guild.id, isKick ? 'moderation' : 'leave', { description: `${member.user.tag} ${isKick ? 'was kicked' : 'left'}`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), type: isKick ? 'kick' : 'leave' });
      Logger.info(`Leave: ${member.user.tag} from ${member.guild.name}`);
    } catch (e) { Logger.error('Leave log error', { error: e.message }); }
  }
};
