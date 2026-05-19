const Logger = require('../utils/logger');
const SettingsManager = require('../utils/settings');

module.exports = {
  name: 'guildCreate',
  async execute(guild, client) {
    try {
      Logger.success(`Joined new server: ${guild.name} (${guild.id}) - ${guild.memberCount} members`);
      
      // Initialize settings for this guild
      await SettingsManager.initGuild(guild.id);
      
      // Emit WebSocket event so dashboard knows
      if (global.emitGuildJoin) {
        global.emitGuildJoin({
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL({ dynamic: true, size: 4096 }),
          memberCount: guild.memberCount,
          ownerId: guild.ownerId,
          createdAt: guild.createdAt,
        });
      }
      
      // Also emit a log event for the guild
      if (global.emitWS) {
        global.emitWS(guild.id, 'info', {
          description: `Bot joined server: ${guild.name}`,
          type: 'guildJoin',
          guildName: guild.name,
          memberCount: guild.memberCount,
        });
      }
    } catch (e) {
      Logger.error('Guild create event error', { error: e.message });
    }
  }
};
