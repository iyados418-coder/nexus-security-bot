const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'channelCreate',
  async execute(channel, client) {
    try {
      if (!channel.guild) return;
      const s = getGuildSettings(channel.guild.id);
      if (!s.securityLogs) return;
      const ch = channel.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      let creator = 'Unknown';
      try { const logs = await channel.guild.fetchAuditLogs({ type: 10, limit: 1 }); const e = logs.entries.first(); if (e && (Date.now() - e.createdTimestamp) < 5000) creator = e.executor; } catch {}
      const types = { 0: 'Text', 2: 'Voice', 4: 'Category', 5: 'Announcement', 13: 'Stage', 15: 'Forum' };
      const e = new EmbedBuilder().setColor(config.colors.success).setTitle('#️⃣ Channel Created')
        .addFields(
          { name: 'Channel', value: `${channel.name}`, inline: true },
          { name: 'Type', value: types[channel.type] || 'Unknown', inline: true },
          { name: '🛠️ By', value: `${creator}`, inline: true },
          { name: 'Category', value: channel.parent?.name || 'None', inline: true }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [e] });
      const creatorUser = typeof creator === 'object' ? creator : null;
      if (global.emitWS) global.emitWS(channel.guild.id, 'security', { description: `Channel #${channel.name} created (${types[channel.type] || 'Unknown'})`, channel: channel.name, channelId: channel.id, creator: creatorUser?.tag || creator, modId: creatorUser?.id, modTag: creatorUser?.tag, modAvatar: creatorUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'channelCreate' });
    } catch (e) { Logger.error('Channel create log error', { error: e.message }); }
  }
};
