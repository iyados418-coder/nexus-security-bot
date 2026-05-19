const Logger = require('./logger');
const SettingsManager = require('./settings');

const violationTracker = new Map();

function getViolationCount(guildId, userId, rule) {
  const key = `${guildId}:${userId}:${rule}`;
  return violationTracker.get(key) || 0;
}

function incrementViolation(guildId, userId, rule) {
  const key = `${guildId}:${userId}:${rule}`;
  const count = (violationTracker.get(key) || 0) + 1;
  violationTracker.set(key, count);
  return count;
}

function resetViolations(guildId, userId, rule) {
  const key = `${guildId}:${userId}:${rule}`;
  violationTracker.delete(key);
}

function getEscalatedAction(actions, violationCount) {
  if (!actions || actions.length === 0) return { action: 'delete' };
  let bestAction = actions[0];
  for (const entry of actions) {
    if (violationCount >= (entry.threshold || 1)) {
      bestAction = entry;
    }
  }
  return bestAction;
}

function hasExemptRole(member, exemptRoleIds) {
  if (!member || !exemptRoleIds || exemptRoleIds.length === 0) return false;
  return member.roles.cache.some(r => exemptRoleIds.includes(r.id));
}

function getUser(id) { return global.botClient?.users?.cache?.get(id) || null; }

async function executeAction(guild, member, action, reason, options = {}) {
  const { timeoutMs, channel, logData } = options;
  const wsData = {
    userId: member?.id || logData?.userId,
    userTag: member?.user?.tag || logData?.userTag,
    username: member?.user?.username || logData?.username,
    userAvatar: member?.user?.displayAvatarURL?.({ dynamic: true, size: 128 }) || logData?.userAvatar,
    channel: channel?.name || logData?.channel,
    channelId: channel?.id || logData?.channelId,
    reason,
    type: action,
  };

  try {
    switch (action) {
      case 'delete':
        if (logData?.message) {
          await logData.message.delete().catch(() => {});
        }
        if (guild && global.emitWS) {
          global.emitWS(guild.id, 'security', { description: `Message deleted — ${reason}`, ...wsData, action: 'autoDelete' });
        }
        break;

      case 'warn': {
        const fs = require('fs');
        const path = require('path');
        const warnsFile = path.join(__dirname, '..', '..', 'logs', 'warns.json');
        let warns = {};
        try { warns = JSON.parse(fs.readFileSync(warnsFile, 'utf8')); } catch {}
        if (member?.id) {
          if (!warns[member.id]) warns[member.id] = [];
          warns[member.id].push({ moderator: 'Auto-Mod', reason, date: new Date().toISOString(), guildId: guild?.id });
          fs.writeFileSync(warnsFile, JSON.stringify(warns, null, 2));
        }
        if (guild && global.emitWS) {
          global.emitWS(guild.id, 'moderation', { description: `⚠️ ${member?.user?.tag || 'User'} warned — ${reason}`, ...wsData, action: 'autoWarn', source: 'automod' });
        }
        break;
      }

      case 'timeout':
        if (member) {
          const dur = timeoutMs || 300000;
          await member.timeout(dur, reason).catch(() => {});
          if (guild && global.emitWS) {
            global.emitWS(guild.id, 'moderation', { description: `⏰ ${member.user.tag} timed out — ${reason}`, ...wsData, action: 'autoTimeout', duration: dur, source: 'automod' });
          }
        }
        break;

      case 'kick':
        if (member?.kickable) {
          await member.kick(reason).catch(() => {});
          if (guild && global.emitWS) {
            global.emitWS(guild.id, 'moderation', { description: `👢 ${member.user.tag} kicked — ${reason}`, ...wsData, action: 'autoKick', source: 'automod' });
          }
        }
        break;

      case 'ban':
        if (member?.bannable) {
          await guild?.members?.ban(member.id, { reason, deleteMessageSeconds: 86400 }).catch(() => {});
          if (guild && global.emitWS) {
            global.emitWS(guild.id, 'moderation', { description: `🔨 ${member.user.tag} banned — ${reason}`, ...wsData, action: 'autoBan', source: 'automod' });
          }
        } else if (guild) {
          await guild.members.ban(member.id, { reason, deleteMessageSeconds: 86400 }).catch(() => {});
        }
        break;
    }
  } catch (e) {
    Logger.error(`ActionExecutor: ${action} failed`, { error: e.message });
  }
}

async function executeEscalatedAction(guild, member, ruleName, reason, options = {}) {
  const settings = SettingsManager.get(guild.id);
  const actionsKey = `${ruleName}_actions`;
  const actions = settings[actionsKey];
  if (!actions || actions.length === 0) return;

  const gid = guild.id;
  const uid = member?.id || options.logData?.userId;
  if (!uid) return;

  const count = incrementViolation(gid, uid, ruleName);
  const entry = getEscalatedAction(actions, count);
  const extraOpts = { ...options, timeoutMs: entry.timeoutMs || options.timeoutMs || 300000 };

  await executeAction(guild, member, entry.action, reason, extraOpts);
  Logger.warn(`${ruleName}: ${member?.user?.tag || uid} — ${entry.action} (violation #${count})`);
}

module.exports = { executeAction, executeEscalatedAction, hasExemptRole, getViolationCount, resetViolations, getEscalatedAction }; 