const { PermissionFlagsBits } = require('discord.js');
const Logger = require('../utils/logger');
const { executeEscalatedAction, hasExemptRole } = require('../utils/actionExecutor');

const LINK_RE = /(https?:\/\/[^\s]+)/gi;

module.exports = {
  async check(message, client) {
    if (message.author.bot) return false;
    if (!LINK_RE.test(message.content)) return false;
    if (message.member?.permissions.has(PermissionFlagsBits.ManageMessages)) return false;

    const settings = getGuildSettings(message.guild.id);
    if (!settings.antiLink) return false;
    if (hasExemptRole(message.member, settings.antiLink_exemptRoles)) return false;

    const key = `${message.guild.id}-${message.author.id}`;
    const now = Date.now();
    if (!client.linkTracker.has(key)) client.linkTracker.set(key, []);
    const links = client.linkTracker.get(key).filter(t => t > now - 60000);
    links.push(now);
    client.linkTracker.set(key, links);

    message.delete().catch(() => {});

    await executeEscalatedAction(message.guild, message.member, 'antiLink',
      `Auto-Mod: Link posted (${links.length} in 1m)`,
      { timeoutMs: 300000, channel: message.channel, logData: { message, userId: message.author.id, userTag: message.author.tag, username: message.author.username, userAvatar: message.author.displayAvatarURL({ dynamic: true, size: 128 }), channel: message.channel.name, channelId: message.channel.id } });

    return true;
  }
};