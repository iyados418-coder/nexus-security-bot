const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    try {
      const member = newState.member || oldState.member;
      if (!member || member.user.bot) return;
      const s = getGuildSettings(member.guild.id);
      if (!s.voiceLogs) return;
      const ch = member.guild.channels.cache.get(s.voiceLogs);
      if (!ch) return;

      const avatar = member.user.displayAvatarURL({ dynamic: true, size: 4096 });
      const base = new EmbedBuilder().setColor(config.colors.primary).setThumbnail(avatar)
        .setFooter({ text: `🛡️ Security Bot • Voice • ${new Date().toLocaleString()}` }).setTimestamp();

      if (!oldState.channelId && newState.channelId) {
        base.setTitle('🔊 Joined Voice').setDescription(`${member.user} joined voice`).addFields(
          { name: '👤 User', value: `${member.user.tag}`, inline: true },
          { name: '🔊 Channel', value: `${newState.channel?.name}`, inline: true }
        );
        await ch.send({ embeds: [base] });
        if (global.emitWS) global.emitWS(member.guild.id, 'voice', { description: `${member.user.tag} joined ${newState.channel?.name}`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), channel: newState.channel?.name, channelId: newState.channelId, type: 'join' });
      } else if (oldState.channelId && !newState.channelId) {
        base.setTitle('🔊 Left Voice').setDescription(`${member.user} left voice`).addFields(
          { name: '👤 User', value: `${member.user.tag}`, inline: true },
          { name: '🔊 Channel', value: `${oldState.channel?.name}`, inline: true }
        );
        await ch.send({ embeds: [base] });
        if (global.emitWS) global.emitWS(member.guild.id, 'voice', { description: `${member.user.tag} left ${oldState.channel?.name}`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), channel: oldState.channel?.name, channelId: oldState.channelId, type: 'leave' });
      } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        base.setTitle('🔊 Switched Voice').setDescription(`${member.user} switched channels`).addFields(
          { name: '👤 User', value: `${member.user.tag}`, inline: true },
          { name: 'From', value: `${oldState.channel?.name}`, inline: true },
          { name: 'To', value: `${newState.channel?.name}`, inline: true }
        );
        await ch.send({ embeds: [base] });
        if (global.emitWS) global.emitWS(member.guild.id, 'voice', { description: `${member.user.tag} switched ${oldState.channel?.name} → ${newState.channel?.name}`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), from: oldState.channel?.name, to: newState.channel?.name, type: 'switch' });
      }

      if (oldState.streaming !== newState.streaming) {
        const e = new EmbedBuilder().setColor(config.colors.info).setThumbnail(avatar)
          .setTitle(`📺 Streaming ${newState.streaming ? 'Started' : 'Stopped'}`)
          .setDescription(`${member.user} ${newState.streaming ? 'started' : 'stopped'} streaming`)
          .addFields({ name: '👤 User', value: `${member.user.tag}`, inline: true })
          .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
        await ch.send({ embeds: [e] });
        if (global.emitWS) global.emitWS(member.guild.id, 'voice', { description: `${member.user.tag} ${newState.streaming ? 'started' : 'stopped'} streaming`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), type: 'stream' });
      }
      if (oldState.selfVideo !== newState.selfVideo) {
        const e = new EmbedBuilder().setColor(config.colors.info).setThumbnail(avatar)
          .setTitle(`📷 Camera ${newState.selfVideo ? 'On' : 'Off'}`)
          .setDescription(`${member.user} ${newState.selfVideo ? 'enabled' : 'disabled'} camera`)
          .addFields({ name: '👤 User', value: `${member.user.tag}`, inline: true })
          .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
        await ch.send({ embeds: [e] });
        if (global.emitWS) global.emitWS(member.guild.id, 'voice', { description: `${member.user.tag} ${newState.selfVideo ? 'enabled' : 'disabled'} camera`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), type: 'camera' });
      }
      if (oldState.selfMute !== newState.selfMute) {
        const e = new EmbedBuilder().setColor(config.colors.warning).setThumbnail(avatar)
          .setTitle(`🔇 ${newState.selfMute ? 'Muted' : 'Unmuted'} Self`)
          .setDescription(`${member.user} ${newState.selfMute ? 'muted' : 'unmuted'} self`)
          .addFields({ name: '👤 User', value: `${member.user.tag}`, inline: true })
          .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
        await ch.send({ embeds: [e] });
        if (global.emitWS) global.emitWS(member.guild.id, 'voice', { description: `${member.user.tag} ${newState.selfMute ? 'muted' : 'unmuted'} self`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), type: 'mute' });
      }
      if (oldState.serverMute !== newState.serverMute) {
        const e = new EmbedBuilder().setColor(config.colors.error).setThumbnail(avatar)
          .setTitle(`🔇 Server ${newState.serverMute ? 'Muted' : 'Unmuted'}`)
          .setDescription(`${member.user} was ${newState.serverMute ? 'muted' : 'unmuted'}`)
          .addFields({ name: '👤 User', value: `${member.user.tag}`, inline: true })
          .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
        await ch.send({ embeds: [e] });
        if (global.emitWS) global.emitWS(member.guild.id, 'voice', { description: `${member.user.tag} server ${newState.serverMute ? 'muted' : 'unmuted'}`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), type: 'serverMute' });
      }
      if (oldState.serverDeaf !== newState.serverDeaf) {
        const e = new EmbedBuilder().setColor(config.colors.error).setThumbnail(avatar)
          .setTitle(`🎧 Server ${newState.serverDeaf ? 'Deafened' : 'Undeafened'}`)
          .setDescription(`${member.user} was ${newState.serverDeaf ? 'deafened' : 'undeafened'}`)
          .addFields({ name: '👤 User', value: `${member.user.tag}`, inline: true })
          .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` }).setTimestamp();
        await ch.send({ embeds: [e] });
        if (global.emitWS) global.emitWS(member.guild.id, 'voice', { description: `${member.user.tag} server ${newState.serverDeaf ? 'deafened' : 'undeafened'}`, userId: member.user.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL({ dynamic: true, size: 128 }), type: 'deafen' });
      }
    } catch (e) { Logger.error('Voice log error', { error: e.message }); }
  }
};
