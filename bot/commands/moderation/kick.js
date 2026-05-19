const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const Logger = require('../../utils/logger');
const Permissions = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(o => o.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the kick').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  cooldown: 5,

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(target.id);

    if (!Permissions.botCan(interaction.guild, PermissionFlagsBits.KickMembers))
      return interaction.editReply({ content: '❌ I need Kick Members permission.' });

    if (target.id === interaction.user.id)
      return interaction.editReply({ content: '❌ You cannot kick yourself.' });
    if (target.id === client.user.id)
      return interaction.editReply({ content: '❌ I cannot kick myself.' });
    if (!member)
      return interaction.editReply({ content: '❌ That user is not in the server.' });
    if (Permissions.isAboveBot(interaction.member, member))
      return interaction.editReply({ content: '❌ That user has a higher or equal role.' });
    if (!member.kickable)
      return interaction.editReply({ content: '❌ I cannot kick that user.' });

    try {
      await member.kick(`By ${interaction.user.tag}: ${reason}`);
      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('👢 Member Kicked')
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 4096 }))
        .addFields(
          { name: '👤 User', value: `${target.tag}`, inline: true },
          { name: '🆔 ID', value: `\`${target.id}\``, inline: true },
          { name: '🛠️ Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: '📋 Reason', value: reason, inline: false }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      Logger.mod(`Kicked ${target.tag} in ${interaction.guild.name}`, { reason, mod: interaction.user.tag });

      const s = getGuildSettings(interaction.guild.id);
      if (s.moderationLogs) {
        const logCh = interaction.guild.channels.cache.get(s.moderationLogs);
        if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (e) {
      Logger.error('Kick error', { error: e.message });
      await interaction.editReply({ content: `❌ Failed to kick: ${e.message}` });
    }
  }
};
