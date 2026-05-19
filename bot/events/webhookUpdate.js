const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');
const AntiWebhookSpam = require('../security/antiWebhookSpam');

module.exports = {
  name: 'webhookUpdate',
  async execute(channel, client) {
    try {
      if (!channel.guild) return;
      AntiWebhookSpam.check(channel, client);
      const s = getGuildSettings(channel.guild.id);
      if (!s.securityLogs) return;
      const ch = channel.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      let action = 'Updated', executor = 'Unknown';
      try { const logs = await channel.guild.fetchAuditLogs({ type: 50, limit: 1 }); const e = logs.entries.first(); if (e && (Date.now() - e.createdTimestamp) < 5000) { action = 'Created'; executor = e.executor; } } catch {}
      try { const logs = await channel.guild.fetchAuditLogs({ type: 51, limit: 1 }); const e = logs.entries.first(); if (e && (Date.now() - e.createdTimestamp) < 5000) { action = 'Deleted'; executor = e.executor; } } catch {}
      const embed = new EmbedBuilder().setColor(action === 'Created' ? config.colors.success : config.colors.error)
        .setTitle(`🔗 Webhook ${action}`).setDescription(`Webhook ${action.toLowerCase()} in ${channel}`)
        .addFields({ name: '#️⃣ Channel', value: `${channel.name}`, inline: true }, { name: '🛠️ By', value: `${executor}`, inline: true })
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
      await ch.send({ embeds: [embed] });
      const executorUser = typeof executor === 'object' ? executor : null;
      if (global.emitWS) global.emitWS(channel.guild.id, 'security', { description: `Webhook ${action.toLowerCase()} in #${channel.name}`, channel: channel.name, channelId: channel.id, action, executor: executorUser?.tag || executor, modId: executorUser?.id, modTag: executorUser?.tag, modAvatar: executorUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'webhook' });
    } catch (e) { Logger.error('Webhook log error', { error: e.message }); }
  }
};
