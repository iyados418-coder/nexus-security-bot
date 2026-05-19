const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const Logger = require('../../utils/logger');
const Permissions = require('../../utils/permissions');

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)\s*(s|m|h|d)$/i);
  if (!match) return null;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const val = num * (ms[unit] || 60000);
  return Math.min(val, 28 * 86400000);
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s) parts.push(`${s}s`);
  return parts.join(' ') || '0s';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout/mute a member')
    .addUserOption(o => o.setName('user').setDescription('The user to timeout').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration (e.g. 10m, 1h, 2d)').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the timeout').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(target.id);

    if (!Permissions.botCan(interaction.guild, PermissionFlagsBits.ModerateMembers))
      return interaction.editReply({ content: '❌ I need Moderate Members permission.' });

    if (target.id === interaction.user.id)
      return interaction.editReply({ content: '❌ You cannot timeout yourself.' });
    if (!member)
      return interaction.editReply({ content: '❌ That user is not in the server.' });
    if (Permissions.isAboveBot(interaction.member, member))
      return interaction.editReply({ content: '❌ That user has a higher or equal role.' });
    if (!member.moderatable)
      return interaction.editReply({ content: '❌ I cannot timeout that user.' });

    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs <= 0)
      return interaction.editReply({ content: '❌ Invalid duration. Use format like: 10m, 1h, 2d, 30s' });
    if (durationMs > 28 * 86400000)
      return interaction.editReply({ content: '❌ Timeout cannot exceed 28 days.' });

    try {
      await member.timeout(durationMs, `By ${interaction.user.tag}: ${reason}`);
      const until = new Date(Date.now() + durationMs);
      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⏰ Member Timed Out')
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 4096 }))
        .addFields(
          { name: '👤 User', value: `${target.tag}`, inline: true },
          { name: '🆔 ID', value: `\`${target.id}\``, inline: true },
          { name: '🛠️ Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: '⏱️ Duration', value: formatDuration(durationMs), inline: true },
          { name: '📋 Reason', value: reason, inline: false },
          { name: 'Expires', value: `<t:${Math.floor(until/1000)}:R>`, inline: true }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
      Logger.mod(`Timed out ${target.tag} in ${interaction.guild.name}`, { duration: formatDuration(durationMs), reason, mod: interaction.user.tag });

      const s = getGuildSettings(interaction.guild.id);
      if (s.moderationLogs) {
        const logCh = interaction.guild.channels.cache.get(s.moderationLogs);
        if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (e) {
      Logger.error('Timeout error', { error: e.message });
      await interaction.editReply({ content: `❌ Failed to timeout: ${e.message}` });
    }
  }
};
