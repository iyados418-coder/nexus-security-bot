const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config/config');
const Logger = require('../utils/logger');
const SettingsManager = require('../utils/settings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Set up security log channels automatically')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 10,

  async execute(interaction, client) {
    await interaction.deferReply();

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return interaction.editReply({ content: '❌ I need Manage Channels permission to set up.' });

    try {
      const existingCategory = interaction.guild.channels.cache.find(
        c => c.type === ChannelType.GuildCategory && c.name === '🛡️ SECURITY LOGS'
      );
      let category;
      if (existingCategory) {
        category = existingCategory;
      } else {
        category = await interaction.guild.channels.create({
          name: '🛡️ SECURITY LOGS',
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            },
            {
              id: interaction.guild.members.me.id,
              allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
            },
          ],
        });
      }

      const channels = {
        memberLogs: 'member-logs',
        voiceLogs: 'voice-logs',
        moderationLogs: 'mod-logs',
        securityLogs: 'security-logs',
      };

      const createdChannels = {};
      for (const [key, name] of Object.entries(channels)) {
        let ch = interaction.guild.channels.cache.find(
          c => c.name === name && c.parentId === category.id
        );
        if (!ch) {
          ch = await interaction.guild.channels.create({
            name: name,
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
              {
                id: interaction.guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: interaction.guild.members.me.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.EmbedLinks],
              },
            ],
          });
        }
        createdChannels[key] = ch.id;
      }

      SettingsManager.update(interaction.guild.id, createdChannels);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Security Bot Setup Complete')
        .setDescription('Log channels have been created and configured.')
        .addFields(
          { name: '📥 Member Logs', value: `<#${createdChannels.memberLogs}>`, inline: true },
          { name: '🔊 Voice Logs', value: `<#${createdChannels.voiceLogs}>`, inline: true },
          { name: '🛠️ Moderation Logs', value: `<#${createdChannels.moderationLogs}>`, inline: true },
          { name: '🛡️ Security Logs', value: `<#${createdChannels.securityLogs}>`, inline: true },
          { name: '📂 Category', value: `${category.name}`, inline: true },
          { name: 'Status', value: '✅ All systems active!', inline: true }
        )
        .addFields({ name: '❓ Need help?', value: 'Use `/settings` to view current config\nUse `/help` for all commands', inline: false })
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      Logger.success(`Setup completed for ${interaction.guild.name}`);
    } catch (e) {
      Logger.error('Setup error', { error: e.message });
      await interaction.editReply({ content: `❌ Setup failed: ${e.message}` });
    }
  }
};
