const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');
const AntiMassChannel = require('../security/antiMassChannel');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    try {
      if (!channel.guild) return;
      AntiMassChannel.check(channel, client);
      const s = getGuildSettings(channel.guild.id);
      if (!s.securityLogs) return;
      const ch = channel.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      let deleter = 'Unknown';
      try { const logs = await channel.guild.fetchAuditLogs({ type: 12, limit: 1 }); const e = logs.entries.first(); if (e && (Date.now() - e.createdTimestamp) < 5000) deleter = e.executor; } catch {}
      const types = { 0: 'Text', 2: 'Voice', 4: 'Category', 5: 'Announcement', 13: 'Stage', 15: 'Forum' };
      const e = new EmbedBuilder().setColor(config.colors.error).setTitle('#️⃣ Channel Deleted')
        .addFields(
          { name: 'Name', value: channel.name, inline: true },
          { name: 'Type', value: types[channel.type] || 'Unknown', inline: true },
          { name: '🛠️ By', value: `${deleter}`, inline: true }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [e] });
      const deleterUser = typeof deleter === 'object' ? deleter : null;
      if (global.emitWS) global.emitWS(channel.guild.id, 'security', { description: `Channel #${channel.name} deleted (${types[channel.type] || 'Unknown'})`, channel: channel.name, channelId: channel.id, deleter: deleterUser?.tag || deleter, modId: deleterUser?.id, modTag: deleterUser?.tag, modAvatar: deleterUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'channelDelete' });
    } catch (e) { Logger.error('Channel delete log error', { error: e.message }); }
  }
};
