const { PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const { executeEscalatedAction, hasExemptRole } = require('../utils/actionExecutor');

const SPAM_THRESHOLD = 5;
const SPAM_WINDOW = 5000;
const SPAM_HIGH = 25;

module.exports = {
  async check(message, client) {
    if (message.author.bot) return false;
    if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

    const settings = getGuildSettings(message.guild.id);
    if (!settings.antiSpam) return false;
    if (hasExemptRole(message.member, settings.antiSpam_exemptRoles)) return false;

    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    if (!client.spamTracker.has(key)) client.spamTracker.set(key, []);
    const msgs = client.spamTracker.get(key).filter(t => t > now - SPAM_WINDOW);
    msgs.push(now);
    client.spamTracker.set(key, msgs);

    if (msgs.length >= SPAM_THRESHOLD) {
      message.delete().catch(() => {});
      await executeEscalatedAction(message.guild, message.member, 'antiSpam',
        `Auto-Mod: Spam detected (${msgs.length} msgs in 5s)`,
        { timeoutMs: 300000, channel: message.channel, logData: { message, userId: message.author.id, userTag: message.author.tag, username: message.author.username, userAvatar: message.author.displayAvatarURL({ dynamic: true, size: 128 }), channel: message.channel.name, channelId: message.channel.id } });
      if (msgs.length >= SPAM_HIGH) {
        message.channel.send({ content: `⚠️ ${message.author} stopped for spamming.` }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
      return true;
    }
    return false;
  }
};