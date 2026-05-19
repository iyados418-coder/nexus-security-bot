const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    try {
      if (oldMember.user.bot) return;
      const s = getGuildSettings(newMember.guild.id);
      if (!s.securityLogs) return;
      const ch = newMember.guild.channels.cache.get(s.securityLogs);
      if (!ch) return;
      const av = newMember.user.displayAvatarURL({ dynamic: true, size: 4096 });

      // Roles added
      const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
      for (const role of added.values()) {
        let mod = 'Unknown';
        try { const logs = await newMember.guild.fetchAuditLogs({ type: 25, limit: 5 }); const e = logs.entries.find(e => e.target.id === newMember.id && (Date.now() - e.createdTimestamp) < 5000); if (e) mod = e.executor; } catch {}
        const e = new EmbedBuilder().setColor(config.colors.success).setTitle('📌 Role Added').setThumbnail(av)
          .addFields({ name: '👤 User', value: `${newMember.user.tag}`, inline: true }, { name: '📌 Role', value: role.name, inline: true }, { name: '🛠️ By', value: `${mod}`, inline: true })
          .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
        await ch.send({ embeds: [e] });
        const modUser = typeof mod === 'object' ? mod : null;
        if (global.emitWS) global.emitWS(newMember.guild.id, 'member', { description: `Role ${role.name} added to ${newMember.user.tag}`, userId: newMember.user.id, userTag: newMember.user.tag, userAvatar: newMember.user.displayAvatarURL({ dynamic: true, size: 128 }), role: role.name, roleId: role.id, moderator: modUser?.tag || mod, modId: modUser?.id, modTag: modUser?.tag, modAvatar: modUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'roleAdd' });
      }

      // Roles removed
      const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id) && r.id !== newMember.guild.id);
      for (const role of removed.values()) {
        let mod = 'Unknown';
        try { const logs = await newMember.guild.fetchAuditLogs({ type: 25, limit: 5 }); const e = logs.entries.find(e => e.target.id === newMember.id && (Date.now() - e.createdTimestamp) < 5000); if (e) mod = e.executor; } catch {}
        const e = new EmbedBuilder().setColor(config.colors.error).setTitle('📌 Role Removed').setThumbnail(av)
          .addFields({ name: '👤 User', value: `${newMember.user.tag}`, inline: true }, { name: '📌 Role', value: role.name, inline: true }, { name: '🛠️ By', value: `${mod}`, inline: true })
          .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
        await ch.send({ embeds: [e] });
        if (global.emitWS) global.emitWS(newMember.guild.id, 'member', { description: `Role ${role.name} removed from ${newMember.user.tag}`, userId: newMember.user.id, userTag: newMember.user.tag, userAvatar: newMember.user.displayAvatarURL({ dynamic: true, size: 128 }), role: role.name, roleId: role.id, moderator: modUser?.tag || mod, modId: modUser?.id, modTag: modUser?.tag, modAvatar: modUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'roleRemove' });
      }

      // Nickname
      if (oldMember.nickname !== newMember.nickname) {
        let mod = 'Unknown';
        try { const logs = await newMember.guild.fetchAuditLogs({ type: 24, limit: 1 }); const e = logs.entries.first(); if (e?.target.id === newMember.id && (Date.now() - e.createdTimestamp) < 5000) mod = e.executor; } catch {}
        const e = new EmbedBuilder().setColor(config.colors.info).setTitle('📝 Nickname Changed').setThumbnail(av)
          .addFields({ name: '👤 User', value: `${newMember.user.tag}`, inline: true }, { name: 'Old', value: oldMember.nickname || 'None', inline: true }, { name: 'New', value: newMember.nickname || 'None', inline: true }, { name: '🛠️ By', value: `${mod}`, inline: true })
          .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
        await ch.send({ embeds: [e] });
        if (global.emitWS) global.emitWS(newMember.guild.id, 'member', { description: `${newMember.user.tag} nickname changed: ${oldMember.nickname || 'None'} → ${newMember.nickname || 'None'}`, userId: newMember.user.id, userTag: newMember.user.tag, userAvatar: newMember.user.displayAvatarURL({ dynamic: true, size: 128 }), oldNick: oldMember.nickname, newNick: newMember.nickname, moderator: modUser?.tag || mod, modId: modUser?.id, modTag: modUser?.tag, modAvatar: modUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'nickname' });
      }

      // Timeout
      if (oldMember.communicationDisabledUntil !== newMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
        let mod = 'Unknown';
        try { const logs = await newMember.guild.fetchAuditLogs({ type: 24, limit: 5 }); const e = logs.entries.find(e => e.target.id === newMember.id && (Date.now() - e.createdTimestamp) < 5000); if (e) mod = e.executor; } catch {}
        const e = new EmbedBuilder().setColor(config.colors.warning).setTitle('⏰ Member Timed Out').setThumbnail(av)
          .addFields({ name: '👤 User', value: `${newMember.user.tag}`, inline: true }, { name: 'Expires', value: `<t:${Math.floor(newMember.communicationDisabledUntil/1000)}:R>`, inline: true }, { name: '🛠️ By', value: `${mod}`, inline: true })
          .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
        await ch.send({ embeds: [e] });
        if (global.emitWS) global.emitWS(newMember.guild.id, 'moderation', { description: `${newMember.user.tag} timed out by ${mod}`, userId: newMember.user.id, userTag: newMember.user.tag, userAvatar: newMember.user.displayAvatarURL({ dynamic: true, size: 128 }), moderator: modUser?.tag || mod, modId: modUser?.id, modTag: modUser?.tag, modAvatar: modUser?.displayAvatarURL({ dynamic: true, size: 128 }), type: 'timeout' });
      }
    } catch (e) { Logger.error('Member update error', { error: e.message }); }
  }
};
