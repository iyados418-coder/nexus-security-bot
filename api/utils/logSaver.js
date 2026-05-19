const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');
const MAX_LOGS_IN_MEMORY = 10000;
const MAX_LOGS_PER_FILE = 3000;
const FLUSH_INTERVAL_MS = 15000;
const FLUSH_BATCH_SIZE = 30;

// In-memory buffer: guildId -> { dateString -> LogEntry[] }
const buffer = new Map();
const dirty = new Set();
let flushTimer = null;
let flushRunning = false;

// Error counter for monitoring
let writeErrors = 0;

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

function makeEntry(type, data) {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type,
    data: typeof data === 'object' ? data : { description: data },
    timestamp: new Date().toISOString(),
  };
}

function saveLog(guildId, type, data) {
  try {
    const today = dateStr();
    if (!buffer.has(guildId)) buffer.set(guildId, {});
    const guildBuf = buffer.get(guildId);
    if (!guildBuf[today]) guildBuf[today] = [];

    const entry = makeEntry(type, data);
    guildBuf[today].unshift(entry);

    if (guildBuf[today].length > MAX_LOGS_IN_MEMORY) {
      guildBuf[today] = guildBuf[today].slice(0, MAX_LOGS_IN_MEMORY);
    }

    dirty.add(guildId);

    if (dirty.size >= FLUSH_BATCH_SIZE) {
      flushDirty();
    } else if (!flushTimer) {
      flushTimer = setTimeout(flushDirty, FLUSH_INTERVAL_MS);
    }
  } catch (e) {
    console.error(`[LogSaver] saveLog error: ${e?.message || e}`);
  }
}

async function flushDirty() {
  if (flushRunning) return;
  flushRunning = true;
  flushTimer = null;

  try {
    if (dirty.size === 0) { flushRunning = false; return; }

    const guilds = [...dirty];
    dirty.clear();

    for (const guildId of guilds) {
      const guildBuf = buffer.get(guildId);
      if (!guildBuf) continue;

      for (const [date, entries] of Object.entries(guildBuf)) {
        try {
          const file = getLogFile(guildId, date);
          let existing = [];
          try {
            const raw = fs.readFileSync(file, 'utf8');
            existing = JSON.parse(raw);
            if (!Array.isArray(existing)) existing = [];
          } catch {}

          const entryMap = new Map();
          for (const e of entries) entryMap.set(e.id, e);
          for (const e of existing) if (!entryMap.has(e.id)) entryMap.set(e.id, e);
          const merged = [...entryMap.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, MAX_LOGS_PER_FILE);

          fs.writeFileSync(file, JSON.stringify(merged, null, 2), 'utf8');
        } catch (e) {
          writeErrors++;
          console.error(`[LogSaver] flush error ${guildId}/${date}: ${e?.message || e}`);
        }
      }
    }
  } finally {
    flushRunning = false;
  }
}

function addBufferToAllLogs(allLogs, guildId, startDate, endDate) {
  const guildBuf = buffer.get(guildId);
  if (!guildBuf) return;
  for (const [date, entries] of Object.entries(guildBuf)) {
    if (startDate && date < startDate) continue;
    if (endDate && date > endDate) continue;
    for (const e of entries) allLogs.push(e);
  }
}

function readFileLogs(guildId, startDate, endDate, guildBuf) {
  const results = [];
  try {
    ensureDir();
    const allFiles = fs.readdirSync(LOGS_DIR);
    const files = allFiles
      .filter(f => f.startsWith(`guild-${guildId}-`) && f.endsWith('.json'))
      .sort()
      .reverse();

    for (const file of files) {
      const fileDate = file.replace(`guild-${guildId}-`, '').replace('.json', '');
      if (startDate && fileDate < startDate) continue;
      if (endDate && fileDate > endDate) continue;
      if (guildBuf && guildBuf[fileDate]) continue;
      try {
        const logs = JSON.parse(fs.readFileSync(path.join(LOGS_DIR, file), 'utf8'));
        if (Array.isArray(logs)) {
          for (const l of logs) results.push(l);
        }
      } catch {}
    }

    if (!startDate && !endDate) {
      try {
        const oldFile = path.join(LOGS_DIR, `guild-${guildId}.json`);
        if (fs.existsSync(oldFile)) {
          const logs = JSON.parse(fs.readFileSync(oldFile, 'utf8'));
          if (Array.isArray(logs)) {
            for (const l of logs) results.push(l);
          }
        }
      } catch {}
    }
  } catch {}
  return results;
}

function getLogs(guildId, opts = {}) {
  try {
    const { limit = 200, offset = 0, startDate, endDate, type, search } = opts;
    const guildBuf = buffer.get(guildId);
    const allLogs = [];

    addBufferToAllLogs(allLogs, guildId, startDate, endDate);
    const fileLogs = readFileLogs(guildId, startDate, endDate, guildBuf);
    for (const l of fileLogs) allLogs.push(l);

    if (type && type !== 'all') {
      for (let i = allLogs.length - 1; i >= 0; i--) {
        if (allLogs[i].type !== type) allLogs.splice(i, 1);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      for (let i = allLogs.length - 1; i >= 0; i--) {
        const l = allLogs[i];
        const d = l.data || {};
        const desc = d.description || '';
        const user = d.userTag || d.username || '';
        const mod = d.modTag || d.moderator || '';
        const content = d.content || '';
        if (!desc.toLowerCase().includes(q) && !user.toLowerCase().includes(q) && !mod.toLowerCase().includes(q) && !content.toLowerCase().includes(q)) {
          allLogs.splice(i, 1);
        }
      }
    }

    allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = allLogs.length;
    const logs = allLogs.slice(offset, offset + limit);

    return { logs, total, offset, limit, hasMore: offset + limit < total };
  } catch {
    return { logs: [], total: 0, offset: 0, limit: 0, hasMore: false };
  }
}

function getAvailableDates(guildId) {
  try {
    ensureDir();
    const fileDates = fs.readdirSync(LOGS_DIR)
      .filter(f => f.startsWith(`guild-${guildId}-`))
      .map(f => f.replace(`guild-${guildId}-`, '').replace('.json', ''));

    const guildBuf = buffer.get(guildId);
    const allDates = new Set(fileDates);
    if (guildBuf) {
      for (const date of Object.keys(guildBuf)) allDates.add(date);
    }

    return [...allDates].sort();
  } catch { return []; }
}

// Flush on shutdown
process.on('SIGTERM', flushDirty);
process.on('SIGINT', flushDirty);
process.on('exit', () => { if (dirty.size > 0) flushDirty(); });

module.exports = { saveLog, getLogs, getAvailableDates };
