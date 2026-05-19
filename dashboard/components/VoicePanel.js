import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '../utils/auth';

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#0d0d0d] border border-white/[0.08] rounded-2xl p-5 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Confirm Action</h3>
            <p className="text-[#555] text-xs">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
          <button onClick={onConfirm} className="bg-red-500/15 text-red-400 hover:bg-red-500/25 text-xs font-medium px-3 py-1.5 rounded-lg transition-all">Confirm</button>
        </div>
      </div>
    </div>
  );
}

function VoiceUserModal({ member: initialMember, guildId, channels, onClose, onUpdate }) {
  const [member, setMember] = useState(initialMember);
  const [processing, setProcessing] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLog, setActionLog] = useState([]);

  const doAction = async (action, extra) => {
    setProcessing(action);
    setConfirmAction(null);
    try {
      const r = await authFetch(`/api/voice/${guildId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, ...extra }),
      });
      if (r.ok) {
        const d = r.ok ? await r.json().catch(() => ({})) : {};
        setActionLog(prev => [{ action, time: Date.now(), success: true, reason: extra.reason || extra.duration || '' }, ...prev].slice(0, 20));
        setMember(prev => {
          const upd = { ...prev };
          if (action === 'mute') upd.mute = extra.state;
          if (action === 'deafen') upd.deaf = extra.state;
          if (action === 'disconnect') { upd._disconnected = true; if (onUpdate) onUpdate(); }
          return upd;
        });
        if (onUpdate && action !== 'disconnect') onUpdate();
      } else {
        const d = await r.json().catch(() => ({}));
        setActionLog(prev => [{ action, time: Date.now(), success: false, error: d.error || 'Failed' }, ...prev].slice(0, 20));
      }
    } catch {
      setActionLog(prev => [{ action, time: Date.now(), success: false, error: 'Connection error' }, ...prev].slice(0, 20));
    }
    setProcessing(null);
  };

  const handleAction = (action, extra) => {
    if (['disconnect', 'kick', 'ban', 'timeout'].includes(action)) {
      setConfirmAction({ action, extra });
    } else {
      doAction(action, extra);
    }
  };

  useEffect(() => { setMember(initialMember); }, [initialMember]);

  const isMuted = member.mute || member.selfMute;
  const isDeaf = member.deaf || member.selfDeaf;
  const isStreaming = member.streaming;
  const hasCamera = member.camera;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#0d0d0d] border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>

        {confirmAction && (
          <ConfirmDialog
            message={`Are you sure you want to ${confirmAction.action} ${member.displayName || member.username}?`}
            onConfirm={() => doAction(confirmAction.action, confirmAction.extra)}
            onCancel={() => setConfirmAction(null)}
          />
        )}

        <div className="p-5">
          <div className="flex items-start gap-4 mb-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/15 to-purple-500/10 border border-white/[0.06] overflow-hidden shadow-lg">
                {member.avatar ? (
                  <img src={member.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl text-white font-bold bg-gradient-to-br from-blue-500/10 to-purple-500/5">
                    {(member.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {isStreaming && (
                <div className="absolute -bottom-1 -right-1 w-5.5 h-5.5 rounded-full bg-green-500 flex items-center justify-center shadow-lg border-2 border-[#0d0d0d]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M5 3l14 9-14 9V3z"/></svg>
                </div>
              )}
              {hasCamera && (
                <div className="absolute -top-1 -right-1 w-5.5 h-5.5 rounded-full bg-blue-500 flex items-center justify-center shadow-lg border-2 border-[#0d0d0d]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-base truncate">{member.displayName || member.username}</h3>
                {member.bot && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold">BOT</span>}
              </div>
              <p className="text-[#555] text-xs">{member.username}{member.discriminator ? `#${member.discriminator}` : ''}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${isMuted ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  {member.mute ? 'SRV MUTE' : member.selfMute ? 'Self Mute' : 'Unmuted'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${isDeaf ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>
                  {member.deaf ? 'SRV DEAF' : 'Hearing'}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-[#444] hover:text-white p-1.5 rounded-xl hover:bg-white/[0.05] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <ActionBtn
              icon={isMuted
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg>'}
              label={member.mute ? 'Unmute' : 'Server Mute'}
              action="mute"
              extra={{ state: !member.mute }}
              color={member.mute ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/10' : 'bg-white/[0.04] text-white hover:bg-white/[0.07] border-white/[0.04]'}
              processing={processing}
              onClick={(a, e) => doAction(a, e)} />
            <ActionBtn
              icon={isDeaf
                ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>'
                : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>'}
              label={member.deaf ? 'Undeafen' : 'Server Deafen'}
              action="deafen"
              extra={{ state: !member.deaf }}
              color={member.deaf ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/10' : 'bg-white/[0.04] text-white hover:bg-white/[0.07] border-white/[0.04]'}
              processing={processing}
              onClick={(a, e) => doAction(a, e)} />
          </div>

          <p className="text-[#666] text-[10px] uppercase tracking-widest font-semibold mb-2">Moderation</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <ActionBtn
              icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/></svg>'
              label="Disconnect"
              action="disconnect"
              color="bg-red-500/10 text-red-400 hover:bg-red-500/20 border-red-500/10"
              processing={processing}
              onClick={handleAction} />
            <ActionBtn
              icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
              label="Timeout 10m"
              action="timeout"
              extra={{ duration: 600000 }}
              color="bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 border-yellow-500/10"
              processing={processing}
              onClick={handleAction} />
            <ActionBtn
              icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="15 9 12 12 9 9"/><line x1="12" y1="12" x2="12" y2="3"/></svg>'
              label="Kick"
              action="kick"
              extra={{ reason: 'Kicked from voice by dashboard' }}
              color="bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border-orange-500/10"
              processing={processing}
              onClick={handleAction} />
            <ActionBtn
              icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
              label="Ban"
              action="ban"
              extra={{ reason: 'Banned from voice by dashboard' }}
              color="bg-red-500/15 text-red-400 hover:bg-red-500/25 border-red-500/15"
              processing={processing}
              onClick={handleAction} />
          </div>

          {channels && channels.length > 0 && (
            <div className="border-t border-white/[0.04] pt-3 mb-3">
              <p className="text-[#666] text-[10px] uppercase tracking-widest font-semibold mb-2">Move to Channel</p>
              <div className="grid grid-cols-2 gap-1.5 max-h-32 overflow-y-auto custom-scroll pr-1">
                {channels.map(ch => (
                  <button key={ch.id} onClick={() => doAction('move', { channelId: ch.id })} disabled={processing === 'move'}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] text-[#888] hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-blue-500/15 transition-all disabled:opacity-30 truncate group">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" className="shrink-0 group-hover:stroke-blue-400 transition-colors"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {actionLog.length > 0 && (
            <div className="border-t border-white/[0.04] pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#555] text-[10px] font-semibold uppercase tracking-widest">Action Log</p>
                <button onClick={() => setActionLog([])} className="text-[#444] hover:text-white text-[10px] transition-colors">Clear</button>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto custom-scroll">
                {actionLog.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white/[0.015]">
                    <span className={`text-[10px] ${log.success ? 'text-green-400' : 'text-red-400'} font-bold`}>{log.success ? '✓' : '✗'}</span>
                    <span className="text-white text-[10px] font-medium capitalize truncate">{log.action}</span>
                    {log.error && <span className="text-red-400 text-[10px] truncate ml-auto">{log.error}</span>}
                    <span className="text-[#444] text-[9px] ml-auto shrink-0">{new Date(log.time).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, action, extra, color, processing, onClick, className }) {
  const isProcessing = processing === action;
  return (
    <button onClick={() => onClick(action, extra || {})} disabled={isProcessing}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all disabled:opacity-35 font-medium text-xs ${color || 'bg-white/[0.04] text-white hover:bg-white/[0.07] border-white/[0.04]'} ${className || ''}`}>
      {isProcessing ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : (
        <span className="shrink-0 flex items-center" dangerouslySetInnerHTML={{ __html: icon }} />
      )}
      <span>{isProcessing ? '...' : label}</span>
    </button>
  );
}

export default function VoicePanel({ guildId }) {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVoice = useCallback(async () => {
    if (!guildId) return;
    setLoading(true); setError(null);
    try {
      const r = await authFetch(`/api/voice/${guildId}`);
      if (r.ok) {
        const d = await r.json();
        setChannels(d.channels || []);
      } else {
        const d = await r.json().catch(() => ({}));
        setError(d.error || 'Failed to load');
      }
    } catch { setError('Connection error'); }
    setLoading(false);
  }, [guildId]);

  useEffect(() => { fetchVoice(); }, [fetchVoice]);

  const totalInVoice = channels.reduce((s, c) => s + c.members.length, 0);
  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const allMembers = channels.flatMap(c => c.members.map(m => ({ ...m, _channel: c.name, _channelId: c.id })));
  const filteredMembers = searchQuery
    ? allMembers.filter(m => (m.username || '').toLowerCase().includes(searchQuery.toLowerCase()) || (m.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  if (loading && channels.length === 0) {
    return (
      <div className="card-premium p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <div className="skeleton h-4 w-28" />
        </div>
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card-premium p-5 text-center">
        <p className="text-red-400 text-xs mb-3">{error}</p>
        <button onClick={fetchVoice} className="btn-secondary text-xs">Retry</button>
      </div>
    );
  }

  return (
    <>
      {selectedMember && (
        <VoiceUserModal
          member={selectedMember}
          guildId={guildId}
          channels={channels.filter(c => c.id !== selectedMember._channelId && c.members.length < (c.userLimit || 999))}
          onClose={() => setSelectedMember(null)}
          onUpdate={fetchVoice}
        />
      )}

      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <h2 className="text-white font-semibold text-sm">Voice Channels</h2>
            <span className="text-[#555] text-[11px] ml-1">{totalInVoice} online</span>
          </div>
          <div className="flex items-center gap-2">
            {allMembers.length > 0 && (
              <div className="relative">
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="glass-input text-[11px] py-1.5 px-2.5 w-32 md:w-40"
                />
                  {searchQuery && filteredMembers.length > 0 && (
                    <div className="absolute top-full mt-1 left-0 right-0 bg-[#0d0d0d]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl max-h-48 overflow-y-auto p-1.5 z-10 animate-dropdown">
                    {filteredMembers.slice(0, 8).map(m => (
                      <button key={m.id} onClick={() => { setSelectedMember(m); setSearchQuery(''); }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] text-left">
                        <div className="w-6 h-6 rounded-full bg-white/[0.05] overflow-hidden shrink-0">
                          {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[9px] text-[#555]">{(m.username||'?').charAt(0)}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-[11px] truncate font-medium">{m.displayName || m.username}</p>
                          <p className="text-[#555] text-[9px] truncate">{m._channel}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <button onClick={fetchVoice} className="btn-ghost text-[11px] px-2 py-1.5" title="Refresh">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            </button>
          </div>
        </div>

        {channels.length === 0 ? (
          <p className="text-[#555] text-xs text-center py-6">No voice channels found</p>
        ) : (
          <div className="space-y-2">
            {channels.map((ch) => {
              const isExpand = expanded[ch.id];
              const userLimit = ch.userLimit || 0;
              return (
                <div key={ch.id} className="rounded-xl bg-white/[0.015] border border-white/[0.04] overflow-hidden transition-all duration-200 hover:border-white/[0.06]">
                  <button onClick={() => toggleExpand(ch.id)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/[0.02] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                    <span className="text-white text-xs font-medium truncate">{ch.name}</span>
                    <div className="flex items-center gap-2 ml-auto shrink-0">
                      {ch.bitrate > 0 && <span className="text-[10px] text-[#555]">{Math.round(ch.bitrate/1000)}kbps</span>}
                      {userLimit > 0 && <span className="text-[10px] text-[#555]">{ch.members.length}/{userLimit}</span>}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ch.members.length > 0 ? 'bg-green-500/10 text-green-400' : 'bg-white/[0.03] text-[#555]'}`}>{ch.members.length}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" className={`transition-transform duration-200 ${isExpand ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                    </div>
                  </button>
                  <div className={`transition-all duration-200 ease-in-out ${isExpand ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                    <div className="px-3 pb-3 space-y-1">
                      {ch.members.length > 0 ? ch.members.map(m => (
                        <button key={m.id} onClick={() => setSelectedMember({ ...m, _channel: ch.name, _channelId: ch.id })}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] hover:border-blue-500/20 transition-all border border-transparent group text-left">
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-full bg-white/[0.05] overflow-hidden">
                              {m.avatar ? (
                                <img src={m.avatar} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-[#555] font-semibold">
                                  {(m.username || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            {m.streaming && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center shadow-lg border border-[#080808]">
                                <svg width="7" height="7" viewBox="0 0 24 24" fill="#fff"><path d="M5 3l14 9-14 9V3z"/></svg>
                              </div>
                            )}
                            {m.camera && (
                              <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center shadow-lg border border-[#080808]">
                                <svg width="6" height="6" viewBox="0 0 24 24" fill="#fff"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-white text-xs truncate font-medium group-hover:text-blue-300 transition-colors">{m.displayName || m.username}</span>
                              {m.bot && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold">BOT</span>}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {m.selfMute && <span className="text-[10px] text-red-400 font-medium flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>Muted</span>}
                              {m.mute && <span className="text-[10px] text-red-400 font-bold flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>SRV-MUTE</span>}
                              {m.selfDeaf && <span className="text-[10px] text-yellow-400 font-medium flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>Deaf</span>}
                              {m.deaf && <span className="text-[10px] text-red-400 font-bold flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>SRV-DEAF</span>}
                              {m.streaming && <span className="text-[10px] text-green-400 font-medium flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-14 9V3z"/></svg>Stream</span>}
                              {m.camera && <span className="text-[10px] text-blue-400 font-medium flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>Camera</span>}
                              {!m.selfMute && !m.mute && !m.selfDeaf && !m.deaf && !m.streaming && !m.camera && <span className="text-[10px] text-green-400/50">Connected</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <span className="text-[10px] text-blue-400 font-medium">Manage</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                          </div>
                        </button>
                      )) : <p className="text-[#555] text-[11px] text-center py-3">Empty channel</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}