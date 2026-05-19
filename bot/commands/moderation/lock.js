const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel (disable @everyone send messages)')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to lock').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason for locking').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 3,

  async execute(interaction, client) {
    await interaction.deferReply();
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels))
      return interaction.editReply({ content: '❌ I need Manage Channels permission.' });

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
        SendMessagesInThreads: false,
      });
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🔒 Channel Locked')
        .setDescription(`${channel} has been locked`)
        .addFields(
          { name: '#️⃣ Channel', value: `${channel.name}`, inline: true },
          { name: '🛠️ Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: '📋 Reason', value: reason, inline: false }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      await channel.send({ content: '🔒 This channel has been locked.', embeds: [embed] }).catch(() => {});

      const s = getGuildSettings(interaction.guild.id);
      if (s.moderationLogs) {
        const logCh = interaction.guild.channels.cache.get(s.moderationLogs);
        if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});
      }
      Logger.mod(`Locked #${channel.name} in ${interaction.guild.name}`, { reason, mod: interaction.user.tag });
    } catch (e) {
      Logger.error('Lock error', { error: e.message });
      await interaction.editReply({ content: `❌ Failed to lock channel: ${e.message}` });
    }
  }
};
