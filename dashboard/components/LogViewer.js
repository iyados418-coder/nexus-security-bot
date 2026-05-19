import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { authFetch } from '../utils/auth';

const MAX_LOGS = 400;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const typeConfig = {
  join: { label: 'Join', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-l-green-500/60', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>' },
  leave: { label: 'Leave', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-l-red-500/60', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>' },
  moderation: { label: 'Mod', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-l-yellow-500/60', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  security: { label: 'Security', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-l-red-500/60', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' },
  voice: { label: 'Voice', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-l-blue-500/60', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>' },
  member: { label: 'Member', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-l-purple-500/60', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
  info: { label: 'Info', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-l-gray-500/60', icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' },
};

const filterOptions = [
  { key: 'all', label: 'All' },
  { key: 'security', label: 'Security' },
  { key: 'voice', label: 'Voice' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'member', label: 'Member' },
  { key: 'join', label: 'Join' },
  { key: 'leave', label: 'Leave' },
];

function formatTime(ts) {
  try { return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  catch { return '--:--:--'; }
}

function formatDate(ts) {
  try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  catch { return ''; }
}

function formatFullDate(ts) {
  try { return new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

function Avatar({ src, name, size = 24 }) {
  if (!src && !name) return null;
  return (
    <div className={`rounded-full bg-white/[0.05] overflow-hidden shrink-0`} style={{ width: size, height: size }}>
      {src ? <img src={src} alt="" className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : null}
      <div className={`w-full h-full items-center justify-center text-[#555] font-medium ${src ? 'hidden' : 'flex'}`} style={{ fontSize: Math.max(9, size * 0.4) }}>
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    </div>
  );
}

function RiskBadge({ data }) {
  const action = (data?.action || data?.type || '').toLowerCase();
  const isHigh = ['ban', 'kick', 'lockdown', 'antiLink', 'antiSpam', 'antiRaid', 'danger', 'channelDelete', 'roleDelete', 'antiLinkTimeout'].some(k => action.includes(k));
  const isMed = ['timeout', 'warn', 'disconnect', 'mute', 'deafen'].some(k => action.includes(k));
  if (!isHigh && !isMed) return null;
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 ${isHigh ? 'bg-red-500/15 text-red-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
      {isHigh ? 'HIGH' : 'MED'}
    </span>
  );
}

function ContentPreview({ text, maxLen = 120 }) {
  if (!text) return null;
  const display = text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  return (
    <div className="mt-1.5 text-[11px] text-[#888] bg-white/[0.02] rounded-lg px-2.5 py-1.5 font-mono border border-white/[0.03] whitespace-pre-wrap break-words max-h-16 overflow-y-auto">
      {display}
    </div>
  );
}

function LogEntry({ log }) {
  const d = log.data || {};
  const cfg = typeConfig[log.type] || typeConfig.info;
  const desc = d.description || log.description || '';
  const hasMod = d.modTag || d.moderator;
  const hasContent = d.content;
  const hasExtra = d.channel || d.role || d.reason;

  return (
    <div className={`log-entry ${log.type || 'info'} border-l-[3px] ${cfg.border || 'border-l-transparent'} mb-1.5 rounded-r-xl hover:bg-white/[0.02] transition-colors`}>
      <div className="flex items-start gap-2.5 px-3 py-2">
        <div className="shrink-0 text-right min-w-[52px]">
          <p className="text-[#555] text-[10px] font-mono leading-tight">{formatTime(log.timestamp || log.time)}</p>
          <p className="text-[#444] text-[8px] font-mono leading-tight">{formatDate(log.timestamp || log.time)}</p>
        </div>
        <div className={`shrink-0 mt-0.5 ${cfg.color}`} dangerouslySetInnerHTML={{ __html: cfg.icon }} />
        <Avatar src={d.userAvatar} name={d.userTag || d.username} size={26} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${cfg.color}`}>{cfg.label}</span>
            <RiskBadge data={d} />
            <span className="text-[#aaa] text-xs truncate">{desc}</span>
          </div>
          {(d.userTag || d.username) && (
            <div className="flex items-center gap-1.5 mt-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span className="text-[11px] text-[#ccc] font-medium">{d.userTag || d.username}</span>
              {d.userId && <span className="text-[9px] text-[#444] font-mono">({d.userId.slice(0, 8)}...)</span>}
            </div>
          )}
          {hasMod && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span className="text-[11px] text-[#888]">by</span>
              <span className="text-[11px] text-[#bbb] font-medium">{d.modTag || d.moderator}</span>
              <Avatar src={d.modAvatar} name={d.modTag || d.moderator} size={16} />
            </div>
          )}
          {hasExtra && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {d.channel && <span className="text-[10px] text-[#555] flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>#{d.channel}</span>}
              {d.role && <span className="text-[10px] text-[#555] flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>{d.role}</span>}
              {d.reason && <span className="text-[10px] text-yellow-400/70 flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>{d.reason}</span>}
            </div>
          )}
          {hasContent && <ContentPreview text={d.content} />}
        </div>
      </div>
    </div>
  );
}

function LiveTab({ guildId }) {
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef(null);
  const containerRef = useRef(null);
  const prevLen = useRef(0);

  useEffect(() => {
    if (!guildId) return;
    (async () => {
      try {
        const r = await authFetch(`/api/logs/${guildId}?limit=30`);
        if (r.ok) {
          const d = await r.json();
          if (d.logs?.length) {
            setLogs(d.logs.map(l => ({ ...l, _id: l.id || Date.now() + Math.random() })));
            setLoaded(true);
          }
        }
      } catch {}
    })();

    const socket = io(API_URL, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
    });
    socket.on('connect', () => { setConnected(true); if (guildId) socket.emit('join-guild', guildId); });
    socket.on('reconnect', () => { if (guildId) socket.emit('join-guild', guildId); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('log', (log) => {
      setLogs(prev => {
        const next = [{ ...log, _id: Date.now() + Math.random() }, ...prev];
        return next.slice(0, MAX_LOGS);
      });
      setLoaded(true);
    });
    return () => socket.disconnect();
  }, [guildId]);

  useEffect(() => {
    if (autoScroll && logs.length > prevLen.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLen.current = logs.length;
  }, [logs, autoScroll]);

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const d = l.data || {};
      const desc = d.description || '';
      const user = d.userTag || d.username || '';
      const mod = d.modTag || d.moderator || '';
      const content = d.content || '';
      if (!desc.toLowerCase().includes(q) && !user.toLowerCase().includes(q) && !mod.toLowerCase().includes(q) && !content.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-red-500'}`} />
          <span className="text-xs text-white font-medium">{connected ? 'Connected' : 'Disconnected'}</span>
          {!connected && <span className="text-[10px] text-red-400/70">Reconnecting...</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const data = filtered.map(l => ({
              time: formatTime(l.timestamp || l.time), date: formatDate(l.timestamp || l.time),
              type: l.type, user: l.data?.userTag || l.data?.username || '',
              moderator: l.data?.modTag || l.data?.moderator || '',
              description: l.data?.description || l.description || '',
              content: l.data?.content || '',
            }));
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `nexus-live-logs-${Date.now()}.json`;
            a.click(); URL.revokeObjectURL(url);
          }} disabled={filtered.length === 0}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#aaa] hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-25">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
          <button onClick={() => setAutoScroll(!autoScroll)}
            className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all border ${autoScroll ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white/[0.03] text-[#555] border-white/[0.04]'}`}>
            Auto {autoScroll ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        {filterOptions.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 text-[11px] rounded-lg transition-all font-medium ${filter === f.key ? 'bg-white text-[#0a0a0a]' : 'bg-white/[0.03] text-[#666] hover:bg-white/[0.06]'}`}>
            {f.label}
          </button>
        ))}
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1 max-w-[180px] ml-auto">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search live..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-white text-[11px] outline-none flex-1 placeholder-[#555] w-20" />
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <p className="text-[#555] text-[11px]">{filtered.length} live event{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="h-80 overflow-y-auto custom-scroll" ref={containerRef} onScroll={() => {
        if (containerRef.current) {
          const el = containerRef.current;
          setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
        }
      }}>
        {!loaded ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
              {connected ? (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ) : (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              )}
            </div>
            <p className="text-[#666] text-xs font-medium mb-1">{connected ? 'Waiting for Events' : 'Not Connected'}</p>
            <p className="text-[#444] text-[11px] text-center max-w-xs leading-relaxed">{connected ? 'Events will appear here in real-time as they happen in your Discord server. Switch to History tab to browse past logs.' : 'Attempting to establish WebSocket connection...'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            </div>
            <p className="text-[#666] text-xs font-medium mb-1">No matching live events</p>
            <p className="text-[#444] text-[10px] text-center max-w-xs">Try changing the filter or search terms</p>
          </div>
        ) : (
          filtered.map(log => <LogEntry key={log._id} log={log} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function HistoryTab({ guildId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchHistory = async (reset = false) => {
    if (!guildId) return;
    setLoading(true); setError('');
    const newOffset = reset ? 0 : offset;
    if (reset) setOffset(0);

    try {
      const params = new URLSearchParams({ limit: '100', offset: newOffset.toString() });
      if (filter !== 'all') params.set('type', filter);
      if (search) params.set('search', search);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const r = await authFetch(`/api/logs/${guildId}?${params}`);
      if (r.ok) {
        const d = await r.json();
        if (reset) {
          setLogs(d.logs || []);
        } else {
          setLogs(prev => [...prev, ...(d.logs || [])]);
        }
        setTotal(d.total || 0);
        setHasMore(d.hasMore || false);
        setOffset(newOffset + (d.logs?.length || 0));
      } else {
        setError('Failed to load history');
      }
    } catch { setError('Connection error'); }
    setLoading(false);
  };

  useEffect(() => {
    if (!guildId) return;
    fetchHistory(true);
    (async () => {
      try {
        const r = await authFetch(`/api/logs/${guildId}/dates`);
        if (r.ok) { const d = await r.json(); setAvailableDates(d.dates || []); }
      } catch {}
    })();
  }, [guildId]);

  const doSearch = () => {
    setSearch(searchInput);
  };

  useEffect(() => {
    fetchHistory(true);
  }, [filter, startDate, endDate, search]);

  const exportHistory = () => {
    if (logs.length === 0) return;
    const data = logs.map(l => ({
      time: formatTime(l.timestamp || l.time),
      date: formatDate(l.timestamp || l.time),
      type: l.type,
      user: l.data?.userTag || l.data?.username || '',
      moderator: l.data?.modTag || l.data?.moderator || '',
      description: l.data?.description || l.description || '',
      content: l.data?.content || '',
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const label = startDate || endDate ? `${startDate || ''}_${endDate || ''}` : 'all';
    a.href = url; a.download = `nexus-history-${label}-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStartDate(''); setEndDate(''); setFilter('all');
    setSearch(''); setSearchInput('');
    fetchHistory(true);
  };

  const hasActiveFilters = filter !== 'all' || search || startDate || endDate;

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span className="text-xs text-white font-medium">Log Archive</span>
          <span className="text-[10px] text-[#555]">{total} total event{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-[10px] text-[#555] hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.04]">Clear filters</button>
          )}
          <button onClick={exportHistory} disabled={logs.length === 0}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#aaa] hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-25">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Export
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="bg-transparent text-white text-[11px] outline-none w-[120px] [color-scheme:dark]" />
          <span className="text-[#444] text-[10px]">to</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="bg-transparent text-white text-[11px] outline-none w-[120px] [color-scheme:dark]" />
        </div>

        {availableDates.length > 0 && (
          <div className="relative group">
            <button className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[#888] hover:text-white transition-all">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              Quick dates
            </button>
            <div className="absolute top-full mt-1 left-0 bg-[#0d0d0d]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl p-1.5 min-w-[140px] z-20 hidden group-hover:block animate-dropdown">
              {availableDates.slice(-14).reverse().map(d => (
                <button key={d} onClick={() => { setStartDate(d); setEndDate(d); }}
                  className="w-full text-left px-2.5 py-1.5 text-[11px] text-[#888] hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors">
                  {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {filterOptions.filter(f => f.key !== 'all').map(f => (
            <button key={f.key} onClick={() => setFilter(filter === f.key ? 'all' : f.key)}
              className={`px-2 py-1 text-[11px] rounded-lg transition-all font-medium ${filter === f.key ? 'bg-white text-[#0a0a0a]' : 'bg-white/[0.03] text-[#666] hover:bg-white/[0.06]'}`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1 max-w-[200px] ml-auto">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search history..." value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') doSearch(); }}
            className="bg-transparent text-white text-[11px] outline-none flex-1 placeholder-[#555] w-16" />
          {searchInput && <button onClick={doSearch} className="text-[10px] text-blue-400 font-medium hover:text-blue-300">Go</button>}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          <span className="text-xs text-red-400">{error}</span>
          <button onClick={() => fetchHistory(true)} className="ml-auto text-xs text-blue-400 hover:text-blue-300">Retry</button>
        </div>
      )}

      <div className="h-80 overflow-y-auto custom-scroll">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mb-3" />
            <p className="text-[#555] text-xs">Loading history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <p className="text-[#666] text-xs font-medium mb-1">{hasActiveFilters ? 'No logs match your filters' : 'No historical logs yet'}</p>
            <p className="text-[#444] text-[11px] text-center max-w-xs">{hasActiveFilters ? 'Try adjusting the date range, type, or search terms' : 'Logs will appear here as events are recorded in your server. The Live tab shows real-time events.'}</p>
          </div>
        ) : (
          <>
            {logs.map((log, i) => <LogEntry key={log.id || i} log={log} />)}
            {hasMore && (
              <div className="flex justify-center py-3">
                <button onClick={() => fetchHistory(false)} disabled={loading}
                  className="flex items-center gap-2 text-xs font-medium px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[#888] hover:text-white hover:bg-white/[0.07] transition-all disabled:opacity-30">
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                  )}
                  {loading ? 'Loading...' : `Load more (${total - offset} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function LogViewer({ guildId }) {
  const [activeTab, setActiveTab] = useState('live');

  return (
    <div className="card-premium p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${activeTab === 'live' ? 'from-green-400 to-green-600' : 'from-blue-400 to-blue-600'} shadow-lg`} />
        <h2 className="text-white font-semibold text-sm">Event Logs</h2>
      </div>

      <div className="flex items-center gap-1 mb-4 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.04] w-fit">
        <button onClick={() => setActiveTab('live')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${activeTab === 'live' ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#555] hover:text-white'}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Live
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${activeTab === 'history' ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#555] hover:text-white'}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          History
        </button>
      </div>

      {activeTab === 'live' ? <LiveTab guildId={guildId} /> : <HistoryTab guildId={guildId} />}
    </div>
  );
}