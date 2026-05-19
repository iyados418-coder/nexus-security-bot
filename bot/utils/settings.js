const fs = require('fs');
const path = require('path');
const SETTINGS_FILE = path.join(__dirname, '..', '..', 'config', 'guild-settings.json');

class SettingsManager {
  static settings = {};

  static load() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        this.settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      } else {
        this.settings = {};
        this.save();
      }
    } catch { this.settings = {}; }
  }

  static save() {
    try {
      const dir = path.dirname(SETTINGS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch {}
  }

  static get(guildId) {
    if (!this.settings[guildId]) {
      this.settings[guildId] = {
        securityLogs: null, voiceLogs: null, moderationLogs: null, memberLogs: null,
        antiLink: true, antiSpam: true, antiMassChannel: true, antiMassRole: true,
        antiWebhookSpam: true, antiRaid: true,
        autoTimeout: true, autoKick: false, autoBan: true,
        lockdown: false,
        antiLink_actions: [{ action: 'delete', threshold: 1 }], antiLink_exemptRoles: [],
        antiSpam_actions: [{ action: 'delete', threshold: 1 }, { action: 'timeout', threshold: 5, timeoutMs: 300000 }], antiSpam_exemptRoles: [],
        antiMassChannel_actions: [{ action: 'ban', threshold: 1 }], antiMassChannel_exemptRoles: [],
        antiMassRole_actions: [{ action: 'ban', threshold: 1 }], antiMassRole_exemptRoles: [],
        antiWebhookSpam_actions: [{ action: 'delete', threshold: 1 }, { action: 'timeout', threshold: 3, timeoutMs: 600000 }], antiWebhookSpam_exemptRoles: [],
        antiRaid_actions: [{ action: 'kick', threshold: 1 }, { action: 'ban', threshold: 5 }], antiRaid_exemptRoles: [],
      };
      this.migrateActions(guildId);
      this.save();
    } else {
      this.migrateActions(guildId);
    }
    return this.settings[guildId];
  }

  static migrateActions(guildId) {
    const s = this.settings[guildId];
    if (!s) return;
    const rules = ['antiLink', 'antiSpam', 'antiMassChannel', 'antiMassRole', 'antiWebhookSpam', 'antiRaid'];
    for (const rule of rules) {
      const actKey = `${rule}_action`;
      const actsKey = `${rule}_actions`;
      const timeKey = `${rule}_timeoutMs`;
      if (s[actKey] && !s[actsKey]) {
        const oldAction = s[actKey];
        const oldTimeout = s[timeKey] || 300000;
        if (oldAction === 'timeout') {
          s[actsKey] = [{ action: 'delete', threshold: 1 }, { action: 'timeout', threshold: 3, timeoutMs: oldTimeout }];
        } else {
          s[actsKey] = [{ action: oldAction, threshold: 1 }];
        }
        delete s[actKey];
        delete s[timeKey];
      }
    }
  }

  static update(guildId, updates) {
    this.settings[guildId] = { ...this.get(guildId), ...updates };
    this.save();
    return this.settings[guildId];
  }

  static initGuild(guildId) {
    if (!this.settings[guildId]) {
      this.settings[guildId] = {
        securityLogs: null, voiceLogs: null, moderationLogs: null, memberLogs: null,
        antiLink: true, antiSpam: true, antiMassChannel: true, antiMassRole: true,
        antiWebhookSpam: true, antiRaid: true,
        autoTimeout: true, autoKick: false, autoBan: true,
        lockdown: false,
        antiLink_actions: [{ action: 'delete', threshold: 1 }], antiLink_exemptRoles: [],
        antiSpam_actions: [{ action: 'delete', threshold: 1 }, { action: 'timeout', threshold: 5, timeoutMs: 300000 }], antiSpam_exemptRoles: [],
        antiMassChannel_actions: [{ action: 'ban', threshold: 1 }], antiMassChannel_exemptRoles: [],
        antiMassRole_actions: [{ action: 'ban', threshold: 1 }], antiMassRole_exemptRoles: [],
        antiWebhookSpam_actions: [{ action: 'delete', threshold: 1 }, { action: 'timeout', threshold: 3, timeoutMs: 600000 }], antiWebhookSpam_exemptRoles: [],
        antiRaid_actions: [{ action: 'kick', threshold: 1 }, { action: 'ban', threshold: 5 }], antiRaid_exemptRoles: [],
      };
      this.save();
    }
    return this.settings[guildId];
  }

  static getAll() { return this.settings; }
}

SettingsManager.load();
module.exports = SettingsManager;
