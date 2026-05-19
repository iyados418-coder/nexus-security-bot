import { useState, useEffect } from 'react';
import { authFetch } from '../utils/auth';

const actions = [
  { key: 'ban', label: 'Ban', color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
  { key: 'kick', label: 'Kick', color: 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' },
  { key: 'timeout', label: 'Timeout', color: 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' },
  { key: 'warn', label: 'Warn', color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' },
];

export default function ModerationPanel({ guildId, onNotify }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('60');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState('');

  useEffect(() => {
    if (!guildId) return;
    authFetch(`/api/guilds/${guildId}/members`).then(async r => {
      if (r.ok) { const d = await r.json(); setMembers(d.members || d || []); }
    }).catch(() => {});
  }, [guildId]);

  const filtered = search
    ? members.filter(m => (m.username || '').toLowerCase().includes(search.toLowerCase()) || (m.nickname || '').toLowerCase().includes(search.toLowerCase()) || m.id === search)
    : members;

  const handleAction = async () => {
    if (!selected || !confirmAction) return;
    setProcessing(true); setResult('');
    const body = { userId: selected.id, reason: reason || `Action by dashboard: ${confirmAction}` };
    if (confirmAction === 'timeout') body.duration = parseInt(duration) * 60000;
    try {
      const r = await authFetch(`/api/moderation/${guildId}/${confirmAction}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (r.ok) {
        setResult(`Successfully ${confirmAction}ed ${selected.username}`);
        if (onNotify) onNotify(`Successfully ${confirmAction}ed ${selected.username}`, 'success');
        setSelected(null); setSearch('');
      } else {
        const err = await r.json().catch(() => ({}));
        setResult(err.error || `Failed to ${confirmAction}`);
        if (onNotify) onNotify(err.error || `Failed to ${confirmAction}`, 'error');
      }
    } catch {
      setResult('Connection error');
      if (onNotify) onNotify('Connection error', 'error');
    }
    setProcessing(false); setConfirmAction(null); setReason('');
    setTimeout(() => setResult(''), 4000);
  };

  return (
    <>
      <div className="relative mb-3">
        <div className="flex items-center gap-2 glass-input px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search members..." value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            className="bg-transparent text-white text-xs outline-none flex-1 placeholder-[#555]" />
        </div>
        {showDropdown && search && filtered.length > 0 && (
          <div className="absolute z-[100] top-full mt-1 left-0 right-0 bg-[#0a0a0a] border border-white/[0.06] rounded-lg shadow-2xl max-h-52 overflow-y-auto p-1.5">
            {filtered.slice(0, 10).map(m => (
              <button key={m.id} onClick={() => { setSelected(m); setSearch(m.username || m.name || ''); setShowDropdown(false); }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.03] text-left">
                <div className="w-6 h-6 rounded-full bg-white/[0.05] overflow-hidden flex-shrink-0">
                  {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-[#555]">{(m.username||'?').charAt(0)}</div>}
                </div>
                <div className="flex-1 min-w-0"><p className="text-white text-xs truncate">{m.username}</p><p className="text-[#555] text-[10px] truncate">{m.nickname || m.id}</p></div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] mb-3">
          <div className="w-7 h-7 rounded-full bg-white/[0.05] overflow-hidden flex-shrink-0">
            {selected.avatar ? <img src={selected.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-[#555]">{(selected.username||'?').charAt(0)}</div>}
          </div>
          <div className="flex-1 min-w-0"><p className="text-white text-xs font-medium truncate">{selected.username}</p><p className="text-[#555] text-[10px] truncate">{selected.nickname || selected.id}</p></div>
          <button onClick={() => { setSelected(null); setSearch(''); }} className="text-[#555] hover:text-white p-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {actions.map(b => (
          <button key={b.key} onClick={() => { if (!selected) return; setConfirmAction(b.key); }} disabled={!selected}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-25 disabled:cursor-not-allowed ${b.color}`}>
            {b.label}
          </button>
        ))}
      </div>

      {result && (
        <div className={`mt-3 p-2.5 rounded-lg text-xs ${result.startsWith('Success') ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {result}
        </div>
      )}

      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-1 capitalize">{confirmAction} Member</h3>
            <p className="text-[#555] text-xs mb-4">Are you sure you want to {confirmAction} <span className="text-white font-medium">{selected?.username}</span>?</p>
            <textarea placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} className="glass-input mb-3 resize-none" rows={2} />
            {confirmAction === 'timeout' && (
              <div className="mb-4">
                <label className="text-[#666] text-xs block mb-1">Duration (minutes)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="1" max="40320" className="glass-input text-xs" />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={handleAction} disabled={processing}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-lg text-white transition-all disabled:opacity-50 ${
                  confirmAction === 'ban' ? 'bg-red-500/20 text-red-400' : confirmAction === 'kick' ? 'bg-orange-500/20 text-orange-400' : confirmAction === 'timeout' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {processing ? 'Processing...' : `Confirm ${confirmAction.charAt(0).toUpperCase() + confirmAction.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
