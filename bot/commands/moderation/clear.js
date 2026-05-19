const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../../config/config');
const Logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Clear messages from a channel')
    .addIntegerOption(o =>
      o.setName('amount').setDescription('Number of messages to delete (2-100)').setRequired(true)
        .setMinValue(2).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const amount = interaction.options.getInteger('amount');
    const user = interaction.options.getUser('user');

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages))
      return interaction.editReply({ content: '❌ I need Manage Messages permission.' });

    try {
      const messages = await interaction.channel.messages.fetch({ limit: 100 });
      let filtered = messages.filter(m => {
        if (m.createdTimestamp < Date.now() - 1209600000) return false;
        if (user && m.author.id !== user.id) return false;
        return true;
      }).first(amount);

      if (!filtered.length)
        return interaction.editReply({ content: '❌ No messages to delete.' });

      const deleted = await interaction.channel.bulkDelete(filtered, true);
      const count = deleted.size;

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🗑️ Messages Cleared')
        .addFields(
          { name: '#️⃣ Channel', value: `${interaction.channel.name}`, inline: true },
          { name: '🗑️ Deleted', value: `${count} messages`, inline: true },
          { name: '👤 Filter', value: user ? `${user.tag}` : 'All users', inline: true }
        )
        .setFooter({ text: `🛡️ Security Bot • ${new Date().toLocaleString()}` })
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });

      Logger.mod(`Cleared ${count} messages in #${interaction.channel.name}`, { guild: interaction.guild.name, mod: interaction.user.tag });

      const s = getGuildSettings(interaction.guild.id);
      if (s.moderationLogs) {
        const logCh = interaction.guild.channels.cache.get(s.moderationLogs);
        if (logCh) await logCh.send({ embeds: [embed] }).catch(() => {});
      }
    } catch (e) {
      Logger.error('Clear error', { error: e.message });
      await interaction.editReply({ content: `❌ Failed to clear messages: ${e.message}` });
    }
  }
};
