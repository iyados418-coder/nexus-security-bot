const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const Logger = require('../../utils/logger');
const Permissions = require('../../utils/permissions');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false))
    .addIntegerOption(o => o.setName('delete_messages').setDescription('Delete messages from (days)').setRequired(false).addChoices({ name: '0 days', value: 0 }, { name: '1 day', value: 1 }, { name: '2 days', value: 2 }, { name: '3 days', value: 3 }, { name: '4 days', value: 4 }, { name: '5 days', value: 5 }, { name: '6 days', value: 6 }, { name: '7 days', value: 7 }))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_messages') || 0;
    const member = interaction.guild.members.cache.get(target.id);

    if (!Permissions.botCan(interaction.guild, PermissionFlagsBits.BanMembers))
      return interaction.editReply({ content: '❌ I need Ban Members permission.' });

    if (target.id === interaction.user.id)
      return interaction.editReply({ content: '❌ You cannot ban yourself.' });
    if (target.id === client.user.id)
      return interaction.editReply({ content: '❌ I cannot ban myself.' });
    if (member && Permissions.isAboveBot(interaction.member, member))
      return interaction.editReply({ content: '❌ That user has a higher or equal role.' });
    if (member && !member.bannable)
      return interaction.editReply({ content: '❌ I cannot ban that user.' });

    try {
      await interaction.guild.members.ban(target.id, { reason: `By ${interaction.user.tag}: ${reason}`, deleteMessageDays: deleteDays });
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🔨 Member Banned')
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 4096 }))
        .addFields(
          { name: '👤 User', value: `${target.tag}`, inline: true },
          { name: '🆔 ID', value: `\`${target.id}\``, inline: true },
          { name: '🛠️ Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: '📋 Reason', value: reason, inline: false },
          { name: '🗑️ Messages Deleted', value: `${deleteDays} day(s)`, inline: true }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      Logger.mod(`Banned ${target.tag} in ${interaction.guild.name}`, { reason, mod: interaction.user.tag });

      const s = getGuildSettings(interaction.guild.id);
      if (s.moderationLogs) {
        const logCh = interaction.guild.channels.cache.get(s.moderationLogs);
        if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (e) {
      Logger.error('Ban error', { error: e.message });
      await interaction.editReply({ content: `❌ Failed to ban: ${e.message}` });
    }
  }
};
