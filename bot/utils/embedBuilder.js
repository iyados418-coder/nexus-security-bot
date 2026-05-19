const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');

class EmbedBuilderUtil {
  static base() {
    return new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTimestamp()
      .setFooter({ text: '🛡️ Security Bot • Advanced Protection', iconURL: 'https://cdn.discordapp.com/emojis/1081535406474842143.png' });
  }

  static log(title, desc, fields = []) {
    const e = this.base().setTitle(`🛡️ ${title}`).setDescription(desc);
    if (fields.length) e.addFields(fields);
    return e;
  }

  static mod(action, target, mod, reason, duration = null) {
    const e = this.base()
      .setTitle(`🛠️ ${action} | ${target.tag}`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '👤 User', value: `${target} (\`${target.id}\`)`, inline: true },
        { name: '🛠️ Moderator', value: `${mod} (\`${mod.id}\`)`, inline: true },
        { name: '📋 Reason', value: reason || 'No reason provided', inline: false }
      );
    if (duration) e.addFields({ name: '⏱️ Duration', value: duration, inline: true });
    return e;
  }

  static error(desc) { return this.base().setColor(config.colors.error).setTitle('❌ Error').setDescription(desc); }
  static success(desc) { return this.base().setColor(config.colors.success).setTitle('✅ Success').setDescription(desc); }
  static warn(desc) { return this.base().setColor(config.colors.warning).setTitle('⚠️ Warning').setDescription(desc); }
}

module.exports = EmbedBuilderUtil;
