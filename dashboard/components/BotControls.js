import { useState, useEffect, useRef } from 'react';
import { authFetch } from '../utils/auth';

export default function BotControls({ guildId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [lockdown, setLockdown] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [showAudit, setShowAudit] = useState(false);
  const [message, setMessage] = useState(null);

  const notify = (msg, type) => {
    setMessage({ msg, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchStatus = async () => {
    if (!guildId) return;
    try {
      const [sr, lr, ar] = await Promise.all([
        authFetch(`/api/control/${guildId}/status`),
        authFetch(`/api/settings/${guildId}`),
        authFetch(`/api/control/${guildId}/audit`),
      ]);
      if (sr.ok) { const d = await sr.json(); setStatus(d); }
      if (lr.ok) { const d = await lr.json(); setLockdown(!!d.settings?.lockdown); }
      if (ar.ok) { const d = await ar.json(); setAuditLog(d.entries || []); }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, [guildId]);

  const doAction = async (action, body) => {
    setProcessing(action);
    try {
      const r = await authFetch(`/api/control/${guildId}/${action}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
      });
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        if (action === 'lockdown') setLockdown(d.lockdown);
        notify(d.message || `${action} successful`, 'success');
        fetchStatus();
      } else {
        const d = await r.json().catch(() => ({}));
        notify(d.error || `Failed: ${action}`, 'error');
      }
    } catch { notify('Connection error', 'error'); }
    setProcessing(null);
  };

  if (loading) return <div className="card-premium p-5"><div className="skeleton h-48" /></div>;

  const formatTime = (ts) => {
    try { return new Date(ts).toLocaleString(); } catch { return '?'; }
  };

  const actionLabels = {
    AUDIT_LOG: 'Audit Log',
    BAN: 'Ban',
    KICK: 'Kick',
    TIMEOUT: 'Timeout',
    MEMBER_UPDATE: 'Member Update',
    CHANNEL_CREATE: 'Channel Create',
    CHANNEL_DELETE: 'Channel Delete',
    ROLE_CREATE: 'Role Create',
    ROLE_DELETE: 'Role Delete',
    MESSAGE_DELETE: 'Message Delete',
  };

  return (
    <>
      {message && (
        <div className={`notification notification-${message.type}`} style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 200 }}>
          <span className="text-white text-xs">{message.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <h2 className="text-white font-semibold text-sm">Bot Status</h2>
          </div>
          <p className="text-[#555] text-xs mb-4">Connection and permissions overview</p>

          {status ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                <div className="w-10 h-10 rounded-full bg-white/[0.05] overflow-hidden shrink-0">
                  {status.botAvatar ? <img src={status.botAvatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm text-[#555]">B</div>}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{status.botTag}</p>
                  <p className="text-[#555] text-xs">{status.botId}</p>
                </div>
                <span className="ml-auto status-dot online" />
              </div>

              <div className="space-y-1.5">
                {[
                  { l: 'Ping', v: `${status.ping}ms` },
                  { l: 'Uptime', v: `${Math.floor(status.uptime / 60)}m ${status.uptime % 60}s` },
                  { l: 'Joined', v: status.joinedAt ? formatTime(status.joinedAt) : '?' },
                  { l: 'Permissions', v: `${status.permissions?.length || 0} permissions` },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.02]">
                    <span className="text-[#555] text-xs">{item.l}</span>
                    <span className="text-white text-xs font-medium">{item.v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[#555] text-xs text-center py-6">Status unavailable</p>
          )}
        </div>

        <div className="card-premium p-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <h2 className="text-white font-semibold text-sm">Bot Controls</h2>
          </div>
          <p className="text-[#555] text-xs mb-4">Manage bot behavior for this server</p>

          <div className="space-y-3">
            <button onClick={() => doAction('restart')} disabled={processing} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all disabled:opacity-40">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-white text-xs font-medium">Refresh Connection</p>
                <p className="text-[#555] text-[11px]">Re-fetch members, channels, roles</p>
              </div>
              {processing === 'restart' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </button>

            <button onClick={() => doAction('sync')} disabled={processing} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all disabled:opacity-40">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v4M12 22v-4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M22 12h-4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-white text-xs font-medium">Sync Server</p>
                <p className="text-[#555] text-[11px]">Full server data synchronization</p>
              </div>
              {processing === 'sync' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </button>

            <button onClick={() => doAction('reload-voice')} disabled={processing} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all disabled:opacity-40">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-white text-xs font-medium">Reload Voice Cache</p>
                <p className="text-[#555] text-[11px]">Refresh all voice channel data</p>
              </div>
              {processing === 'reload-voice' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </button>

            <button onClick={() => doAction('reconnect-ws')} disabled={processing} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all disabled:opacity-40">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-white text-xs font-medium">Reconnect WebSocket</p>
                <p className="text-[#555] text-[11px]">Reset dashboard WebSocket connection</p>
              </div>
              {processing === 'reconnect-ws' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </button>

            <button onClick={() => doAction('reload-commands')} disabled={processing} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all disabled:opacity-40">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-white text-xs font-medium">Reload Commands</p>
                <p className="text-[#555] text-[11px]">Hot-reload all slash commands</p>
              </div>
              {processing === 'reload-commands' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </button>

            <button onClick={() => doAction('lockdown')} disabled={processing} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all disabled:opacity-40">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${lockdown ? 'bg-red-500/10' : 'bg-white/[0.04]'}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={lockdown ? '#ef4444' : 'currentColor'} strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-white text-xs font-medium">{lockdown ? 'Disable Lockdown' : 'Emergency Lockdown'}</p>
                <p className="text-[#555] text-[11px]">{lockdown ? 'Server is currently locked down' : 'Lock all channels and restrict access'}</p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${lockdown ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.03] text-[#555]'}`}>{lockdown ? 'ACTIVE' : 'OFF'}</span>
              {processing === 'lockdown' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </button>

            <button onClick={() => doAction('test-log')} disabled={processing} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all disabled:opacity-40">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-white text-xs font-medium">Test Event</p>
                <p className="text-[#555] text-[11px]">Send test log to verify live logs</p>
              </div>
              <span className="text-[#555] text-[10px] px-2 py-0.5 rounded bg-white/[0.03]">TEST</span>
              {processing === 'test-log' && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            </button>

            <button onClick={() => setShowAudit(!showAudit)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all">
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-white text-xs font-medium">Audit Log</p>
                <p className="text-[#555] text-[11px]">Recent server audit entries</p>
              </div>
              <span className="text-[#555] text-xs">{auditLog.length} entries</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" className={`transition-transform ${showAudit ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>

          {showAudit && (
            <div className="mt-3 space-y-1">
              {auditLog.length === 0 ? (
                <p className="text-[#555] text-xs text-center py-4">No audit entries available</p>
              ) : (
                auditLog.slice(0, 10).map(entry => (
                  <div key={entry.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02]">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-[#888]">{actionLabels[entry.action] || entry.action}</span>
                        {entry.executorTag && <span className="text-[10px] text-[#555]">by {entry.executorTag}</span>}
                      </div>
                      {entry.reason && <p className="text-[10px] text-[#555] truncate">{entry.reason}</p>}
                    </div>
                    <span className="text-[10px] text-[#555] shrink-0">{entry.createdAt ? formatTime(entry.createdAt) : ''}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
