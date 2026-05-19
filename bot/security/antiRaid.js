const Logger = require('../utils/logger');
const { executeEscalatedAction, hasExemptRole } = require('../utils/actionExecutor');

module.exports = {
  async check(member, client) {
    if (member.user.bot) return;
    const settings = getGuildSettings(member.guild.id);
    if (!settings.antiRaid) return;
    if (hasExemptRole(member, settings.antiRaid_exemptRoles)) return;

    const key = `${member.guild.id}-joins`;
    const now = Date.now();
    if (!client.joinTracker.has(key)) client.joinTracker.set(key, []);
    const joins = client.joinTracker.get(key).filter(t => t > now - 60000);
    joins.push(now);
    client.joinTracker.set(key, joins);

    const accountAge = (now - member.user.createdTimestamp) / 1000;

    if ((accountAge < 300 && joins.length > 3) || joins.length > 10) {
      const reason = accountAge < 300
        ? `Auto-Mod: New account rapid join (age: ${Math.floor(accountAge)}s)`
        : `Auto-Mod: Mass join detected (${joins.length}/min)`;

      await executeEscalatedAction(member.guild, member, 'antiRaid', reason,
        { logData: { userId: member.id, userTag: member.user.tag, username: member.user.username, userAvatar: member.user.displayAvatarURL?.({ dynamic: true, size: 128 }) } });
      Logger.warn(`Anti-Raid: ${member.user.tag}`, { joinsInMinute: joins.length, accountAge: Math.floor(accountAge) + 's' });
      return true;
    }
    return false;
  }
};