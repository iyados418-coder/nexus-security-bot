const path = require('path');

module.exports = {
  bot: {
    status: '🔒 Security Mode',
    activity: '🔒 Protecting Servers',
  },
  colors: {
    primary: 0xFF0000,
    secondary: 0x000000,
    success: 0x00FF00,
    warning: 0xFFA500,
    error: 0xFF0000,
    info: 0x36393F,
  },
  emojis: {
    shield: '🛡️', warning: '⚠️', error: '❌', success: '✅',
    join: '📥', leave: '📤', voice: '🔊', mute: '🔇',
    deafen: '🎧', role: '📌', channel: '#️⃣', ban: '🔨',
    kick: '👢', timeout: '⏰', message: '💬', edit: '✏️',
    delete: '🗑️', nickname: '📝', emoji: '😀', webhook: '🔗',
    link: '🔗', spam: '🤖', lock: '🔒', unlock: '🔓',
    camera: '📷', stream: '📺', settings: '⚙️', search: '🔍',
    time: '🕐', user: '👤', mod: '🛠️', raid: '🚨',
  },
  security: {
    maxLinksPerMinute: 3,
    maxMessagesPerSecond: 5,
    maxChannelDelete: 3,
    maxRoleDelete: 3,
    maxWebhookCreate: 2,
    maxJoinsPerMinute: 10,
    timeoutDuration: 5 * 60 * 1000,
  },
};
