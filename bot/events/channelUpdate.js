const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'channelUpdate',
  async execute(oldC, newC, client) {
    try {
      if (!newC.guild) return;
      const s = getGuildSettings(newC.guild.id);
      if (!s.securityLogs) return;
      const ch = newC.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      const changes = [];
      if (oldC.name !== newC.name) changes.push(`**Name**: \`${oldC.name}\` → \`${newC.name}\``);
      if (oldC.topic !== newC.topic) changes.push(`**Topic**: \`${oldC.topic || 'None'}\` → \`${newC.topic || 'None'}\``);
      if (oldC.nsfw !== newC.nsfw) changes.push(`**NSFW**: ${oldC.nsfw ? 'Yes' : 'No'} → ${newC.nsfw ? 'Yes' : 'No'}`);
      if (oldC.rateLimitPerUser !== newC.rateLimitPerUser) changes.push(`**Slowmode**: ${oldC.rateLimitPerUser || 0}s → ${newC.rateLimitPerUser || 0}s`);
      if (oldC.bitrate !== newC.bitrate) changes.push(`**Bitrate**: ${oldC.bitrate || 0} → ${newC.bitrate || 0}`);
      if (oldC.userLimit !== newC.userLimit) changes.push(`**User Limit**: ${oldC.userLimit || 0} → ${newC.userLimit || 0}`);
      if (!changes.length) return;
      let updater = 'Unknown';
      try { const logs = await newC.guild.fetchAuditLogs({ type: 11, limit: 1 }); const e = logs.entries.first(); if (e && (Date.now() - e.createdTimestamp) < 5000) updater = e.executor; } catch {}
      const e = new EmbedBuilder().setColor(config.colors.info).setTitle('#️⃣ Channel Updated')
        .addFields(
          { name: 'Channel', value: `${newC.name}`, inline: true },
          { name: '🛠️ By', value: `${updater}`, inline: true },
          { name: 'Changes', value: changes.join('\n'), inline: false }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [e] });
      const updaterUser = typeof updater === 'object' ? updater : null;
      if (global.emitWS) global.emitWS(newC.guild.id, 'security', { description: `Channel #${newC.name} updated: ${changes[0]}`, channel: newC.name, channelId: newC.id, updater: updaterUser?.tag || updater, modId: updaterUser?.id, modTag: updaterUser?.tag, modAvatar: updaterUser?.displayAvatarURL({ dynamic: true, size: 128 }), changes: changes.join(', '), type: 'channelUpdate' });
    } catch (e) { Logger.error('Channel update log error', { error: e.message }); }
  }
};
