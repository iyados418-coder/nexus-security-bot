const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to unlock').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason for unlocking').setRequired(false))
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
        SendMessages: null,
        AddReactions: null,
        CreatePublicThreads: null,
        CreatePrivateThreads: null,
        SendMessagesInThreads: null,
      });
      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🔓 Channel Unlocked')
        .setDescription(`${channel} has been unlocked`)
        .addFields(
          { name: '#️⃣ Channel', value: `${channel.name}`, inline: true },
          { name: '🛠️ Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: '📋 Reason', value: reason, inline: false }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      await channel.send({ content: '🔓 This channel has been unlocked.', embeds: [embed] }).catch(() => {});

      const s = getGuildSettings(interaction.guild.id);
      if (s.moderationLogs) {
        const logCh = interaction.guild.channels.cache.get(s.moderationLogs);
        if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});
      }
      Logger.mod(`Unlocked #${channel.name} in ${interaction.guild.name}`, { reason, mod: interaction.user.tag });
    } catch (e) {
      Logger.error('Unlock error', { error: e.message });
      await interaction.editReply({ content: `❌ Failed to unlock channel: ${e.message}` });
    }
  }
};
