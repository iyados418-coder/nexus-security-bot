const Logger = require('../utils/logger');

module.exports = {
  name: 'guildDelete',
  async execute(guild, client) {
    try {
      Logger.warn(`Left server: ${guild.name} (${guild.id})`);
      
      // Emit WebSocket event so dashboard knows
      if (global.emitGuildLeave) {
        global.emitGuildLeave({
          id: guild.id,
          name: guild.name,
        });
      }
    } catch (e) {
      Logger.error('Guild delete event error', { error: e.message });
    }
  }
};
