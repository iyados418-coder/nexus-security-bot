const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../../config/config');
const Logger = require('../../utils/logger');

const WARNS_FILE = path.join(__dirname, '..', '..', '..', 'config', 'warns.json');

function loadWarns() {
  try {
    if (fs.existsSync(WARNS_FILE)) return JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));
  } catch {}
  return {};
}

function saveWarns(w) {
  try {
    const dir = path.dirname(WARNS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(WARNS_FILE, JSON.stringify(w, null, 2), 'utf8');
  } catch {}
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a member')
    .addUserOption(o => o.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 3,

  async execute(interaction, client) {
    await interaction.deferReply();
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const member = interaction.guild.members.cache.get(target.id);

    if (target.id === interaction.user.id)
      return interaction.editReply({ content: '❌ You cannot warn yourself.' });
    if (target.id === client.user.id)
      return interaction.editReply({ content: '❌ I cannot warn myself.' });

    const warns = loadWarns();
    const guildKey = interaction.guild.id;
    if (!warns[guildKey]) warns[guildKey] = {};
    if (!warns[guildKey][target.id]) warns[guildKey][target.id] = [];
    warns[guildKey][target.id].push({
      mod: interaction.user.tag,
      reason,
      date: new Date().toISOString(),
      case: warns[guildKey][target.id].length + 1
    });
    saveWarns(warns);

    const warnCount = warns[guildKey][target.id].length;
    try {
      if (member) await member.send({ content: `⚠️ You have been warned in **${interaction.guild.name}**\n**Reason:** ${reason}\n**Case:** #${warnCount}` }).catch(() => {});
    } catch {}

    const embed = new EmbedBuilder()
      .setColor(config.colors.warning)
      .setTitle('⚠️ Member Warned')
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 4096 }))
      .addFields(
        { name: '👤 User', value: `${target.tag}`, inline: true },
        { name: '🆔 ID', value: `\`${target.id}\``, inline: true },
        { name: '🛠️ Moderator', value: `${interaction.user.tag}`, inline: true },
        { name: '📋 Reason', value: reason, inline: false },
        { name: '⚠️ Warn Count', value: `#${warnCount}`, inline: true }
      )
      .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
    Logger.mod(`Warned ${target.tag} in ${interaction.guild.name}`, { reason, case: warnCount, mod: interaction.user.tag });

    const s = getGuildSettings(interaction.guild.id);
    if (s.moderationLogs) {
      const logCh = interaction.guild.channels.cache.get(s.moderationLogs);
      if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});
    }
  }
};
