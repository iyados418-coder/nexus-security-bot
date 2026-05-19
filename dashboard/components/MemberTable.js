import { useState, useEffect } from 'react';
import { authFetch } from '../utils/auth';

function relativeTime(dateStr) {
  if (!dateStr) return '?';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function statusColor(s) {
  if (s === 'online') return '#22c55e';
  if (s === 'idle') return '#eab308';
  if (s === 'dnd') return '#ef4444';
  return '#444';
}

export default function MemberTable({ guildId, onNotify }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterBot, setFilterBot] = useState('all');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('username');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const perPage = 20;

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    authFetch(`/api/guilds/${guildId}/members`)
      .then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          setMembers(d.members || d || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [guildId]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir('asc'); }
    setPage(0);
  };

  const SortIcon = ({ k }) => {
    if (sortBy !== k) {
      return (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2">
          <path d="M8 10l4-4 4 4" />
          <path d="M8 14l4 4 4-4" />
        </svg>
      );
    }
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2">
        {sortDir === 'asc' ? <path d="M8 10l4-4 4 4" /> : <path d="M8 14l4 4 4-4" />}
      </svg>
    );
  };

  const filtered = members.filter((m) => {
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = (m.username || '').toLowerCase().includes(q);
      const nickMatch = (m.nickname || '').toLowerCase().includes(q);
      const idMatch = (m.id || '').includes(q);
      if (!nameMatch && !nickMatch && !idMatch) return false;
    }
    if (filterBot === 'users' && m.bot) return false;
    if (filterBot === 'bots' && !m.bot) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'joinedAt') {
      const va = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
      const vb = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    }
    const va = (a[sortBy] || '').toString().toLowerCase();
    const vb = (b[sortBy] || '').toString().toLowerCase();
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const paged = sorted.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(sorted.length / perPage);

  const statusLabel = (s) => {
    if (s === 'online') return 'Online';
    if (s === 'idle') return 'Idle';
    if (s === 'dnd') return 'DND';
    return 'Offline';
  };

  const toggleExpand = (id) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  if (loading) {
    return (
      <div className="card-premium p-5">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-8 w-24" />
          <div className="skeleton h-8 w-16 ml-auto" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="skeleton h-8 w-8 rounded-full shrink-0" />
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-4 w-16 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-premium p-5">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 glass-input px-3 py-1.5 flex-1 min-w-[160px] max-w-[220px]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="bg-transparent text-white text-xs outline-none flex-1 placeholder-[#555]"
          />
        </div>
        <div className="flex gap-1 bg-white/[0.02] rounded-lg p-0.5">
          {[
            { key: 'all', label: 'All' },
            { key: 'users', label: 'Users' },
            { key: 'bots', label: 'Bots' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilterBot(f.key); setPage(0); }}
              className={`px-2.5 py-1 text-[11px] rounded-md transition-all font-medium ${
                filterBot === f.key
                  ? 'bg-white text-[#0a0a0a]'
                  : 'text-[#666] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[#555] text-xs ml-auto">{sorted.length} member{sorted.length !== 1 ? 's' : ''}</p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="1.5" className="mb-3">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p className="text-[#555] text-sm font-medium mb-1">
            {search || filterBot !== 'all' ? 'No members match your filters' : 'No members found'}
          </p>
          <p className="text-[#444] text-xs">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>
                  <button onClick={() => toggleSort('username')} className="flex items-center gap-1 uppercase">
                    User <SortIcon k="username" />
                  </button>
                </th>
                <th className="hidden sm:table-cell">Status</th>
                <th className="hidden sm:table-cell">Nickname</th>
                <th className="hidden md:table-cell">Top Role</th>
                <th className="hidden lg:table-cell">Voice</th>
                <th>
                  <button onClick={() => toggleSort('joinedAt')} className="flex items-center gap-1 uppercase">
                    Joined <SortIcon k="joinedAt" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => toggleExpand(m.id)}
                        className="p-0.5 rounded hover:bg-white/[0.06] transition-colors"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#555"
                          strokeWidth="2"
                          className={`transition-transform duration-150 ${
                            expandedRow === m.id ? 'rotate-90' : ''
                          }`}
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white/[0.05] overflow-hidden shrink-0 relative">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-[#555] font-semibold">
                            {m.username?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#080808]"
                          style={{ background: statusColor(m.presence) }}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium truncate flex items-center gap-1.5">
                          {m.username}
                          <span className="text-[#555] text-[10px] font-normal">{m.tag || ''}</span>
                          {m.bot && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold tracking-wide">
                              BOT
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell">
                    <span className="inline-flex items-center gap-1.5 text-[11px]">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: statusColor(m.presence) }}
                      />
                      <span
                        className={
                          m.presence === 'online'
                            ? 'text-green-400'
                            : m.presence === 'idle'
                            ? 'text-yellow-400'
                            : m.presence === 'dnd'
                            ? 'text-red-400'
                            : 'text-[#555]'
                        }
                      >
                        {statusLabel(m.presence)}
                      </span>
                    </span>
                  </td>
                  <td className="hidden sm:table-cell text-xs">
                    {m.nickname || <span className="text-[#444]">&mdash;</span>}
                  </td>
                  <td className="hidden md:table-cell">
                    {m.roles && m.roles.length > 0 ? (
                      <span className="text-[11px] text-[#aaa] truncate block max-w-[120px]">
                        {m.roles[0].name}
                      </span>
                    ) : (
                      <span className="text-[#444] text-xs">&mdash;</span>
                    )}
                  </td>
                  <td className="hidden lg:table-cell">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        m.inVoice
                          ? 'text-green-400'
                          : 'text-[#555]'
                      }`}
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                      {m.inVoice ? 'In Voice' : 'Offline'}
                    </span>
                  </td>
                  <td className="text-[11px] text-[#555] whitespace-nowrap">
                    <span title={m.joinedAt ? new Date(m.joinedAt).toLocaleString() : ''}>
                      {relativeTime(m.joinedAt)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
          <p className="text-[#555] text-[11px]">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-secondary text-[11px] px-2.5 py-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="btn-secondary text-[11px] px-2.5 py-1 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {expandedRow && (() => {
        const m = members.find((x) => x.id === expandedRow);
        if (!m) return null;
        return (
          <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/[0.05] p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/[0.05] overflow-hidden shrink-0">
                {m.avatar ? (
                  <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-[#555] font-semibold">
                    {m.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-white text-sm font-semibold">{m.username}</h4>
                  {m.bot && <span className="badge badge-info text-[9px]">BOT</span>}
                </div>
                <p className="text-[#555] text-[11px] mt-0.5">{m.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <div className="bg-white/[0.02] rounded-lg p-2.5">
                <p className="text-[#555] text-[10px] uppercase tracking-wide font-medium">Nickname</p>
                <p className="text-white text-xs mt-1">{m.nickname || <span className="text-[#444]">None</span>}</p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-2.5">
                <p className="text-[#555] text-[10px] uppercase tracking-wide font-medium">Status</p>
                <p className="text-white text-xs mt-1 flex items-center gap-1.5 capitalize">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor(m.presence) }} />
                  {m.presence || 'offline'}
                </p>
              </div>
              <div className="bg-white/[0.02] rounded-lg p-2.5">
                <p className="text-[#555] text-[10px] uppercase tracking-wide font-medium">Joined</p>
                <p className="text-white text-xs mt-1">
                  {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : '?'}
                </p>
              </div>
            </div>

            {m.roles && m.roles.length > 0 && (
              <div className="mt-3">
                <p className="text-[#555] text-[10px] uppercase tracking-wide font-medium mb-2">
                  Roles ({m.roles.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {m.roles.map((r) => (
                    <span key={r.id} className="badge badge-info text-[9px]">{r.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
