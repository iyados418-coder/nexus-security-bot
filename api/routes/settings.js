const router = require('express').Router();
const auth = require('../middleware/auth');
const SettingsManager = require('../../bot/utils/settings');

// Get guild settings
router.get('/:guildId', auth, (req, res) => {
  const client = global.botClient;
  if (!client?.guilds?.cache?.has(req.params.guildId)) return res.status(404).json({ error: 'Guild not found' });
  const settings = SettingsManager.get(req.params.guildId);
  res.json({ settings });
});

// Update guild settings
router.post('/:guildId', auth, (req, res) => {
  const client = global.botClient;
  if (!client?.guilds?.cache?.has(req.params.guildId)) return res.status(404).json({ error: 'Guild not found' });

  const allowed = ['securityLogs', 'voiceLogs', 'moderationLogs', 'memberLogs',
    'antiLink', 'antiSpam', 'antiMassChannel', 'antiMassRole', 'antiWebhookSpam', 'antiRaid',
    'autoTimeout', 'autoKick', 'autoBan', 'lockdown',
    'antiLink_actions', 'antiLink_exemptRoles',
    'antiSpam_actions', 'antiSpam_exemptRoles',
    'antiMassChannel_actions', 'antiMassChannel_exemptRoles',
    'antiMassRole_actions', 'antiMassRole_exemptRoles',
    'antiWebhookSpam_actions', 'antiWebhookSpam_exemptRoles',
    'antiRaid_actions', 'antiRaid_exemptRoles'];

  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const settings = SettingsManager.update(req.params.guildId, updates);
  res.json({ success: true, settings });
});

module.exports = router;
