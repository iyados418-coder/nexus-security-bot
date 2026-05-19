const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');
const MAX_LOGS_PER_DAY = 2000;

function ensureDir() {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function dateStr(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toISOString().slice(0, 10);
}

function getLogFile(guildId, date) {
  ensureDir();
  return path.join(LOGS_DIR, `guild-${guildId}-${date || dateStr()}.json`);
}

function saveLog(guildId, type, data) {
  try {
    const file = getLogFile(guildId);
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(file, 'utf8')); } catch {}
    logs.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      type,
      data: typeof data === 'object' ? data : { description: data },
      timestamp: new Date().toISOString(),
    });
    if (logs.length > MAX_LOGS_PER_DAY) logs = logs.slice(0, MAX_LOGS_PER_DAY);
    fs.writeFileSync(file, JSON.stringify(logs, null, 2), 'utf8');
  } catch {}
}

function getLogs(guildId, opts = {}) {
  try {
    const {
      limit = 200,
      offset = 0,
      startDate,
      endDate,
      type,
      search,
    } = opts;

    ensureDir();
    const allFiles = fs.readdirSync(LOGS_DIR);
    const files = allFiles
      .filter(f => f.startsWith(`guild-${guildId}-`) && f.endsWith('.json'))
      .sort()
      .reverse();

    // Also read old format file (guild-{guildId}.json without date)
    const oldFile = `guild-${guildId}.json`;

    let allLogs = [];

    for (const file of files) {
      const fileDate = file.replace(`guild-${guildId}-`, '').replace('.json', '');
      if (startDate && fileDate < startDate) continue;
      if (endDate && fileDate > endDate) continue;
      try {
        const logs = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, file), 'utf8'));
        allLogs = allLogs.concat(logs);
      } catch {}
    }

    // Load old format file if no date filter
    if (!startDate && !endDate) {
      try {
        const oldPath = path.join(LOGS_DIR, oldFile);
        if (fs.existsSync(oldPath)) {
          const logs = JSON.parse(fs.readFileSync(oldPath, 'utf8'));
          allLogs = allLogs.concat(logs);
        }
      } catch {}
    }

    if (type && type !== 'all') {
      allLogs = allLogs.filter(l => l.type === type);
    }

    if (search) {
      const q = search.toLowerCase();
      allLogs = allLogs.filter(l => {
        const d = l.data || {};
        const desc = d.description || '';
        const user = d.userTag || d.username || '';
        const mod = d.modTag || d.moderator || '';
        const content = d.content || '';
        return desc.toLowerCase().includes(q) || user.toLowerCase().includes(q) || mod.toLowerCase().includes(q) || content.toLowerCase().includes(q);
      });
    }

    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = allLogs.length;
    const logs = allLogs.slice(offset, offset + limit);

    return { logs, total, offset, limit, hasMore: offset + limit < total };
  } catch { return { logs: [], total: 0, offset: 0, limit: 0, hasMore: false }; }
}

function getAvailableDates(guildId) {
  try {
    ensureDir();
    const files = fs.readdirSync(LOGS_DIR)
      .filter(f => f.startsWith(`guild-${guildId}-`));
    const dates = files.map(f => f.replace(`guild-${guildId}-`, '').replace('.json', '')).sort();
    return dates;
  } catch { return []; }
}

module.exports = { saveLog, getLogs, getAvailableDates };
