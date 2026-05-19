import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import LogViewer from '../../components/LogViewer';
import MemberTable from '../../components/MemberTable';
import VoicePanel from '../../components/VoicePanel';
import BotControls from '../../components/BotControls';
import CustomSelect from '../../components/CustomSelect';
import { authFetch, clearToken } from '../../utils/auth';

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'security', label: 'Security' },
  { key: 'moderation', label: 'Moderation' },
  { key: 'members', label: 'Members' },
  { key: 'logs', label: 'Logs' },
  { key: 'voice', label: 'Voice' },
  { key: 'control', label: 'Controls' },
];

const securityToggles = [
  { key: 'antiLink', label: 'Anti-Link', desc: 'Block Discord invite links and suspicious URLs' },
  { key: 'antiSpam', label: 'Anti-Spam', desc: 'Detect and remove spam messages automatically' },
  { key: 'antiMassChannel', label: 'Anti-Mass Channel', desc: 'Prevent mass channel creation or deletion' },
  { key: 'antiMassRole', label: 'Anti-Mass Role', desc: 'Prevent mass role assignment or removal' },
  { key: 'antiWebhookSpam', label: 'Anti-Webhook Spam', desc: 'Detect and block webhook abuse' },
  { key: 'antiRaid', label: 'Anti-Raid', desc: 'Automatic raid detection and server lockdown' },
];

const actionOptions = [
  { value: 'delete', label: 'Delete Message', color: 'text-gray-400' },
  { value: 'warn', label: 'Warn User', color: 'text-blue-400' },
  { value: 'timeout', label: 'Timeout', color: 'text-yellow-400' },
  { value: 'kick', label: 'Kick', color: 'text-orange-400' },
  { value: 'ban', label: 'Ban', color: 'text-red-400' },
];

const logChannelKeys = [
  { key: 'securityLogs', label: 'Security Logs' },
  { key: 'voiceLogs', label: 'Voice Logs' },
  { key: 'moderationLogs', label: 'Moderation Logs' },
  { key: 'memberLogs', label: 'Member Logs' },
];

const moderationActions = [
  { key: 'ban', label: 'Ban', color: 'bg-red-500/10 text-red-400 hover:bg-red-500/20' },
  { key: 'kick', label: 'Kick', color: 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20' },
  { key: 'timeout', label: 'Timeout', color: 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' },
  { key: 'warn', label: 'Warn', color: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20' },
];

function StatCard({ label, value, sub, icon, glow }) {
  return (
    <div className={`card-premium p-4 hover-lift ${glow || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#555] text-[10px] font-semibold uppercase tracking-widest">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-white/[0.03] flex items-center justify-center text-white/50" dangerouslySetInnerHTML={{ __html: icon }} />
      </div>
      <p className="stat-value text-lg md:text-xl">{value}</p>
      {sub && <p className="text-[#555] text-[11px] mt-1 font-medium">{sub}</p>}
    </div>
  );
}

function Notification({ message, type, onClose }) {
  useEffect(() => { if (message) { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); } }, [message]);
  if (!message) return null;
  return (
    <div className={`notification notification-${type}`}>
      {type === 'success' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
      )}
      <span className="text-white text-xs">{message}</span>
    </div>
  );
}

export default function ServerPage() {
  const router = useRouter();
  const { id } = router.query;
  const [guild, setGuild] = useState(null);
  const [channels, setChannels] = useState([]);
  const [stats, setStats] = useState(null);
  const [settings, setSettings] = useState({});
  const [logChannels, setLogChannels] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingLogs, setSavingLogs] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const fetched = useRef(false);

  const notify = (msg, type) => setNotification({ message: msg, type });
  const clearNotify = () => setNotification(null);

  useEffect(() => {
    if (!id || fetched.current) return;
    fetched.current = true;
    (async () => {
      try {
        const [gr, cr, sr, srr] = await Promise.all([
          authFetch(`/api/guilds/${id}`), authFetch(`/api/guilds/${id}/channels`),
          authFetch(`/api/stats/${id}`), authFetch(`/api/settings/${id}`),
        ]);
        if (gr.ok) { const d = await gr.json(); setGuild(d); }
        else if (gr.status === 401) { clearToken(); window.location.href = '/login'; return; }
        else if (gr.status === 503) { setError('API offline'); setLoading(false); return; }
        if (cr.ok) { const d = await cr.json(); setChannels(d.channels || d || []); }
        if (sr.ok) { const d = await sr.json(); setStats(d); }
        if (srr.ok) {
          const d = await srr.json();
          const s = d.settings || {};
          setSettings(s);
          setLogChannels({
            securityLogs: s.securityLogs || '', voiceLogs: s.voiceLogs || '',
            moderationLogs: s.moderationLogs || '', memberLogs: s.memberLogs || '',
          });
        }
      } catch (e) { setError('Failed to load server data'); }
      setLoading(false);
    })();
  }, [id]);

  const updateSetting = async (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    try {
      const r = await authFetch(`/api/settings/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (r.ok) notify(`${securityToggles.find(t => t.key === key)?.label || key} updated`, 'success');
      else { setSettings(prev => ({ ...prev, [key]: !value })); notify('Failed to update setting', 'error'); }
    } catch { setSettings(prev => ({ ...prev, [key]: !value })); notify('Connection error', 'error'); }
  };

  const saveLogChannels = async () => {
    setSavingLogs(true);
    try {
      const r = await authFetch(`/api/settings/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logChannels),
      });
      if (r.ok) notify('Log channels saved', 'success');
      else notify('Failed to save log channels', 'error');
    } catch { notify('Connection error', 'error'); }
    setSavingLogs(false);
  };

  if (loading) {
    return (
      <Layout guild={null}>
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="skeleton h-6 w-40" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-20" />)}</div>
          <div className="skeleton h-48" />
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout guild={null}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <p className="text-white font-semibold text-sm mb-1">{error}</p>
            <p className="text-[#555] text-xs mb-4">Could not load server data.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => window.location.reload()} className="btn-primary text-xs">Retry</button>
              <button onClick={() => window.location.href = '/dashboard'} className="btn-secondary text-xs">Back</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const textChannels = Array.isArray(channels) ? channels.filter(c => c.type === 0 || c.type === 'text') : [];
  const voiceChannelsList = Array.isArray(channels) ? channels.filter(c => c.type === 2 || c.type === 'voice') : [];
  const voiceActive = stats?.voice?.active || 0;
  const memberCount = stats?.members?.total || guild?.memberCount || '?';
  const onlineCount = stats?.members?.online || 0;
  const botPing = stats?.bot?.ping || guild?.ping || 0;
  const totalChannels = stats?.channels?.total || (Array.isArray(channels) ? channels.length : '?');
  const roleCount = stats?.roles || 0;
  const rolesList = guild?.roles || [];
  const boosts = stats?.boosts || 0;
  const bots = stats?.members?.bots || 0;

  return (
    <Layout guild={guild}>
      <Notification message={notification?.message} type={notification?.type} onClose={clearNotify} />

      <div className="max-w-6xl mx-auto space-y-5">
        {/* Premium Tabs */}
        <div className="card-premium p-1 flex items-center gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap relative ${
                activeTab === t.key
                  ? 'text-white bg-blue-500/10 border border-blue-500/20'
                  : 'text-[#555] hover:text-white hover:bg-white/[0.03] border border-transparent'
              }`}>
              {activeTab === t.key && <div className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-8 h-0.5 bg-blue-500 rounded-full" />}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <StatCard label="Members" value={memberCount} sub={`${onlineCount} online`} glow="glow-blue"
                icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' />
              <StatCard label="Online" value={onlineCount} sub={memberCount !== '?' && onlineCount !== '?' ? `${Math.round((onlineCount/memberCount)*100)}% online rate` : ''} glow="glow-green"
                icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>' />
              <StatCard label="Channels" value={totalChannels} sub={`${textChannels.length} text, ${voiceChannelsList.length} voice`} glow="glow-cyan"
                icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' />
              <StatCard label="Voice Active" value={voiceActive}
                icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>' />
              <StatCard label="Ping" value={`${botPing}ms`} glow="glow-purple"
                icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-fadeInUp">
              <div className="card-premium p-5">
                <h2 className="text-white font-semibold text-sm mb-1">Server Information</h2>
                <p className="text-[#555] text-xs mb-4">Guild details and bot data</p>
                <div className="space-y-2">
                  {[
                    { l: 'Server Name', v: guild?.name },
                    { l: 'Server ID', v: guild?.id },
                    { l: 'Owner ID', v: guild?.ownerId },
                    { l: 'Created', v: guild?.createdAt ? new Date(guild.createdAt).toLocaleDateString() : '?' },
                    { l: 'Member Count', v: memberCount },
                    { l: 'Online', v: onlineCount },
                    { l: 'Bots', v: bots },
                    { l: 'Roles', v: roleCount },
                    { l: 'Boosts', v: boosts },
                    { l: 'Channels', v: totalChannels },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.02]">
                      <span className="text-[#555] text-xs">{item.l}</span>
                      <span className="text-white text-xs font-medium">{item.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-premium p-5">
                <h2 className="text-white font-semibold text-sm mb-1">Quick Actions</h2>
                <p className="text-[#555] text-xs mb-4">Jump to management sections</p>
                <div className="space-y-2">
                  {[
                    { k: 'security', l: 'Security Settings', d: 'Toggle anti-raid, anti-link, anti-spam', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>', color: 'text-blue-400' },
                    { k: 'moderation', l: 'Moderation', d: 'Ban, kick, timeout, warn members', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>', color: 'text-yellow-400' },
                    { k: 'members', l: 'Members', d: 'View and manage server members', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>', color: 'text-purple-400' },
                    { k: 'logs', l: 'Live Logs', d: 'Real-time event monitoring', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', color: 'text-green-400' },
                    { k: 'voice', l: 'Voice', d: 'Voice channel activity tracking', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>', color: 'text-cyan-400' },
                    { k: 'control', l: 'Bot Controls', d: 'Connection, commands, lockdown', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', color: 'text-red-400' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setActiveTab(item.k)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-blue-500/20 transition-all text-left border border-transparent group">
                      <div className={`w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>{<span dangerouslySetInnerHTML={{ __html: item.icon }} />}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium">{item.l}</p>
                        <p className="text-[#555] text-[11px]">{item.d}</p>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" className="group-hover:stroke-blue-400 transition-colors"><path d="M9 18l6-6-6-6"/></svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── SECURITY ── */}
        {activeTab === 'security' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="card-premium p-5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <h2 className="text-white font-semibold text-sm">Security Modules</h2>
                </div>
                <p className="text-[#555] text-xs mb-4">Toggle security protections on or off</p>
                <div className="space-y-2">
                  {securityToggles.map(t => (
                    <div key={t.key} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.03] hover:border-blue-500/10 transition-all border border-transparent">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-white text-xs font-medium">{t.label}</p>
                        <p className="text-[#555] text-[11px] mt-0.5">{t.desc}</p>
                      </div>
                      <input type="checkbox" checked={!!settings[t.key]} onChange={() => updateSetting(t.key, !settings[t.key])} className="toggle-switch" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card-premium p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <h2 className="text-white font-semibold text-sm">Log Channels</h2>
                    </div>
                    <p className="text-[#555] text-xs mt-0.5">Configure log destinations</p>
                  </div>
                  <button onClick={saveLogChannels} disabled={savingLogs} className="btn-primary text-xs py-1.5 px-3">
                    {savingLogs ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <div className="space-y-3">
                  {logChannelKeys.map(lk => (
                    <div key={lk.key}>
                      <label className="text-white text-xs font-medium block mb-1">{lk.label}</label>
                      <CustomSelect
                        value={logChannels[lk.key] || ''}
                        onChange={v => setLogChannels(p => ({ ...p, [lk.key]: v }))}
                        options={textChannels.map(ch => ({ value: ch.id, label: `#${ch.name}` }))}
                        placeholder="— None —"
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card-premium p-5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/20" />
                <h2 className="text-white font-semibold text-sm">Escalation Chains</h2>
              </div>
              <p className="text-[#555] text-xs mb-4">Build a multi-stage response pipeline — each rule escalates from warning to severe actions as violations accumulate</p>

              <div className="space-y-4">
                {securityToggles.map(t => {
                  const actsKey = `${t.key}_actions`;
                  const exemptKey = `${t.key}_exemptRoles`;
                  const currentActions = settings[actsKey] || [{ action: 'delete', threshold: 1 }];
                  const currentExempt = settings[exemptKey] || [];

                  const addAction = (newAction) => {
                    const maxThreshold = currentActions.reduce((m, a) => Math.max(m, a.threshold || 1), 0);
                    const newActions = [...currentActions, { action: newAction, threshold: maxThreshold + 2, timeoutMs: 300000 }];
                    updateSetting(actsKey, newActions);
                  };

                  const removeAction = (idx) => {
                    const newActions = currentActions.filter((_, i) => i !== idx);
                    updateSetting(actsKey, newActions.length > 0 ? newActions : [{ action: 'delete', threshold: 1 }]);
                  };

                  const updateActionField = (idx, field, value) => {
                    const newActions = currentActions.map((a, i) => i === idx ? { ...a, [field]: value } : a);
                    updateSetting(actsKey, newActions);
                  };

                  const usedActions = currentActions.map(a => a.action);

                  const actionMeta = (act) => {
                    const map = {
                      delete: { label: 'Delete', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' },
                      warn: { label: 'Warn', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>' },
                      timeout: { label: 'Timeout', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' },
                      kick: { label: 'Kick', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><polyline points="15 9 12 12 9 9"/><line x1="12" y1="12" x2="12" y2="3"/></svg>' },
                      ban: { label: 'Ban', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>' },
                    };
                    return map[act] || map.delete;
                  };

                  return (
                    <div key={t.key} className="rounded-2xl bg-gradient-to-br from-white/[0.02] to-white/[0.01] border border-white/[0.05] overflow-hidden transition-all duration-200 hover:border-white/[0.08]">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.03]">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${settings[t.key] ? 'bg-green-500/10' : 'bg-white/[0.03]'}`}>
                            <div className={`w-2 h-2 rounded-full ${settings[t.key] ? 'bg-green-400 shadow-lg shadow-green-500/30' : 'bg-[#444]'}`} />
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">{t.label}</p>
                            <p className="text-[#555] text-[10px] mt-0.5">{t.desc}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-[#444] font-medium">Module</span>
                            <button onClick={() => updateSetting(t.key, !settings[t.key])}
                              className={`relative w-9 h-5 rounded-full transition-all duration-300 ${settings[t.key] ? 'bg-green-500/30' : 'bg-white/[0.06]'}`}>
                              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${settings[t.key] ? 'left-4 bg-green-400' : 'left-0.5'}`} />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="relative">
                          {currentActions.length > 0 && (
                            <div className="absolute left-[17px] top-0 bottom-0 w-px bg-gradient-to-b from-white/[0.06] via-white/[0.03] to-transparent" />
                          )}
                          <div className="space-y-3">
                            {currentActions.map((act, idx) => {
                              const meta = actionMeta(act.action);
                              const isLast = idx === currentActions.length - 1;
                              return (
                                <div key={idx} className={`relative flex gap-3 ${isLast ? '' : 'pb-0'}`}>
                                  <div className="relative z-10 flex items-center justify-center w-9 h-9 rounded-xl border shrink-0 mt-0.5 transition-all duration-150 hover:scale-110"
                                    style={{ borderColor: `var(--${act.action}-border, rgba(255,255,255,0.08))` }}>
                                    <div className={`w-full h-full rounded-xl flex items-center justify-center ${meta.bg} border ${meta.border}`}>
                                      <span className={meta.color} dangerouslySetInnerHTML={{ __html: meta.icon }} />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <select value={act.action} onChange={e => updateActionField(idx, 'action', e.target.value)}
                                        className={`bg-transparent text-xs font-semibold outline-none cursor-pointer appearance-none ${meta.color} hover:opacity-80 transition-opacity`}>
                                        {actionOptions.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                      </select>
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-[#555]">after</span>
                                        <div className="flex items-center bg-white/[0.04] rounded-lg border border-white/[0.06] overflow-hidden">
                                          <button onClick={() => updateActionField(idx, 'threshold', Math.max(1, (act.threshold || 1) - 1))}
                                            className="px-1.5 py-1 text-[#555] hover:text-white hover:bg-white/[0.06] transition-colors text-xs">−</button>
                                          <span className="px-1.5 text-white text-xs font-bold min-w-[20px] text-center tabular-nums">{act.threshold || 1}</span>
                                          <button onClick={() => updateActionField(idx, 'threshold', (act.threshold || 1) + 1)}
                                            className="px-1.5 py-1 text-[#555] hover:text-white hover:bg-white/[0.06] transition-colors text-xs">+</button>
                                        </div>
                                        <span className="text-[10px] text-[#555]">violation{act.threshold !== 1 ? 's' : ''}</span>
                                      </div>
                                      {act.action === 'timeout' && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-[#555]">·</span>
                                          <select value={act.timeoutMs || 300000} onChange={e => updateActionField(idx, 'timeoutMs', parseInt(e.target.value))}
                                            className="bg-white/[0.04] text-yellow-400 text-[10px] outline-none cursor-pointer rounded-lg border border-white/[0.06] px-2 py-1 appearance-none">
                                            <option value="60000">1 min</option>
                                            <option value="300000">5 min</option>
                                            <option value="600000">10 min</option>
                                            <option value="1800000">30 min</option>
                                            <option value="3600000">1 hour</option>
                                            <option value="86400000">24 hours</option>
                                          </select>
                                        </div>
                                      )}
                                      <button onClick={() => removeAction(idx)}
                                        className="ml-auto text-[#444] hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 transition-all shrink-0" title="Remove">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                      </button>
                                    </div>
                                    {!isLast && (
                                      <div className="flex items-center gap-1.5 mt-1 ml-0.5">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" className="-rotate-90"><polyline points="6 9 12 15 18 9"/></svg>
                                        <span className="text-[9px] text-[#444]">then escalates to next step</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mt-3 ml-[3px]">
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.02] border border-dashed border-white/[0.06] text-[10px] text-[#555] font-medium">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Add step
                          </div>
                          {actionOptions.map(a => {
                            const meta = actionMeta(a.value);
                            const isUsed = usedActions.includes(a.value);
                            return (
                              <button key={a.value} onClick={() => addAction(a.value)} disabled={isUsed && a.value !== 'timeout'}
                                className={`flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg border transition-all disabled:opacity-20 disabled:cursor-not-allowed ${meta.bg} ${meta.border} ${meta.color} hover:brightness-125`}>
                                <span dangerouslySetInnerHTML={{ __html: meta.icon }} />
                                <span>{meta.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-5 pt-4 border-t border-white/[0.04]">
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="w-5 h-5 rounded-lg bg-white/[0.03] flex items-center justify-center">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            </div>
                            <span className="text-[11px] font-semibold text-[#888] uppercase tracking-wider">Exempt Roles</span>
                            {currentExempt.length > 0 && (
                              <span className="text-[9px] text-[#555] bg-white/[0.03] px-1.5 py-0.5 rounded-full">{currentExempt.length} selected</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5 min-h-[28px] mb-2.5">
                            {currentExempt.length === 0 ? (
                              <span className="text-[#444] text-[11px] italic flex items-center gap-1">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                                No exempt roles — all members affected
                              </span>
                            ) : (
                              rolesList.filter(r => currentExempt.includes(r.id)).slice(0, 8).map(r => (
                                <span key={r.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-white text-[10px] font-medium transition-all hover:border-white/[0.12] group">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color || '#555' }} />
                                  <span className="truncate max-w-[80px]">{r.name}</span>
                                  <button onClick={() => updateSetting(exemptKey, currentExempt.filter(id => id !== r.id))} className="text-[#444] hover:text-red-400 ml-0.5 transition-colors opacity-0 group-hover:opacity-100">
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                  </button>
                                </span>
                              ))
                            )}
                            {currentExempt.length > 8 && (
                              <span className="text-[#555] text-[10px] font-medium bg-white/[0.03] px-2 py-1 rounded-full">+{currentExempt.length - 8} more</span>
                            )}
                          </div>
                          <select value=""
                            onChange={e => {
                              if (e.target.value && !currentExempt.includes(e.target.value)) {
                                updateSetting(exemptKey, [...currentExempt, e.target.value]);
                              }
                              e.target.value = '';
                            }}
                            className="bg-white/[0.03] border border-white/[0.06] text-white text-[11px] rounded-xl px-3 py-2 outline-none w-full cursor-pointer appearance-none transition-all hover:border-white/[0.12] focus:border-blue-500/30">
                            <option value="" className="bg-[#0d0d0d] text-[#555]">+ Add role to exempt list...</option>
                            {rolesList.filter(r => !currentExempt.includes(r.id)).map(r => (
                              <option key={r.id} value={r.id} className="bg-[#0d0d0d] text-white">{r.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── MODERATION ── */}
        {activeTab === 'moderation' && (
          <div className="card-premium p-5 animate-fadeIn">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <h2 className="text-white font-semibold text-sm">Moderation Panel</h2>
            </div>
            <p className="text-[#555] text-xs mb-4">Quick moderation actions</p>
            <ModerationPanel guildId={id} onNotify={(m, t) => notify(m, t)} />
          </div>
        )}

        {/* ── MEMBERS ── */}
        {activeTab === 'members' && (
          <div className="card-premium p-0 overflow-hidden animate-fadeIn">
            <div className="p-5 pb-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-purple-400" />
                <h2 className="text-white font-semibold text-sm">Member Management</h2>
              </div>
              <p className="text-[#555] text-xs mb-4">View and manage server members</p>
            </div>
            <MemberTable guildId={id} onNotify={(m, t) => notify(m, t)} />
          </div>
        )}

        {/* ── LOGS ── */}
        {activeTab === 'logs' && (
          <div className="animate-fadeIn">
            <LogViewer guildId={id} />
          </div>
        )}

        {/* ── VOICE ── */}
        {activeTab === 'voice' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Active in Voice" value={voiceActive} glow="glow-cyan"
                icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>' />
              <StatCard label="Voice Channels" value={voiceChannelsList.length} glow="glow-blue"
                icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' />
              <StatCard label="Bot Ping" value={`${botPing}ms`} glow="glow-purple"
                icon='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' />
            </div>
            <VoicePanel guildId={id} />
          </div>
        )}

        {/* ── CONTROLS ── */}
        {activeTab === 'control' && (
          <div className="animate-fadeIn">
            <BotControls guildId={id} />
          </div>
        )}

        {/* Server info footer */}
        <div className="card-premium p-5 animate-fadeIn">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white font-semibold text-sm">Server Details</h2>
            <span className={`status-dot ${stats ? 'online' : 'offline'}`} />
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-[#555]">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> <span className="text-white/60 font-medium">{roleCount}</span> Roles</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> <span className="text-white/60 font-medium">{boosts}</span> Boosts</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> <span className="text-white/60 font-medium">{bots}</span> Bots</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /> <span className="text-white/60 font-medium">{totalChannels}</span> Channels</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> <span className="text-white/60 font-medium">{memberCount}</span> Total Members</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ModerationPanel({ guildId, onNotify }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [action, setAction] = useState(null);
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('60');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    authFetch(`/api/guilds/${guildId}/members`).then(async r => {
      if (r.ok) { const d = await r.json(); setMembers(d.members || d || []); }
    }).catch(() => {});
  }, [guildId]);

  const filtered = search ? members.filter(m => (m.username || '').toLowerCase().includes(search.toLowerCase()) || (m.nickname || '').toLowerCase().includes(search.toLowerCase()) || m.id === search) : members;

  const execute = async (act) => {
    if (!selected) return;
    setProcessing(true);
    const body = { userId: selected.id, reason: reason || `Action via dashboard: ${act}` };
    if (act === 'timeout') body.duration = parseInt(duration) * 60000;
    try {
      const r = await authFetch(`/api/moderation/${guildId}/${act}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = r.ok ? null : await r.json().catch(() => ({}));
      if (r.ok) { onNotify(`Successfully ${act}ed ${selected.username}`, 'success'); setSelected(null); setSearch(''); }
      else { onNotify(data?.error || `Failed to ${act}`, 'error'); }
    } catch { onNotify(`Failed to ${act}: connection error`, 'error'); }
    setProcessing(false); setAction(null); setReason('');
  };

  return (
    <>
      <div className="relative mb-3">
        <div className="flex items-center gap-2 glass-input px-3 py-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Search members..." value={search} onChange={e => { setSearch(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)}
            className="bg-transparent text-white text-xs outline-none flex-1 placeholder-[#555]" />
        </div>
          {showDropdown && search && filtered.length > 0 && (
          <div className="absolute z-[100] top-full mt-1 left-0 right-0 bg-[#0d0d0d]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl max-h-52 overflow-y-auto p-1.5 animate-dropdown">
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
        {moderationActions.map(b => (
          <button key={b.key} onClick={() => { if (!selected) return; setAction(b.key); }} disabled={!selected}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-25 disabled:cursor-not-allowed ${b.color}`}>
            {b.label}
          </button>
        ))}
      </div>

      {action && (
        <div className="modal-overlay" onClick={() => setAction(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white mb-1 capitalize">{action} Member</h3>
            <p className="text-[#555] text-xs mb-4">Are you sure you want to {action} <span className="text-white font-medium">{selected?.username}</span>?</p>
            <textarea placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} className="glass-input mb-3 resize-none" rows={2} />
            {action === 'timeout' && (
              <div className="mb-4">
                <label className="text-[#666] text-xs block mb-1">Duration (minutes)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="1" max="40320" className="glass-input text-xs" />
              </div>
            )}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setAction(null)} className="btn-secondary text-xs">Cancel</button>
              <button onClick={() => execute(action)} disabled={processing}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-lg text-white transition-all disabled:opacity-50 ${
                  action === 'ban' ? 'bg-red-500/20 text-red-400' : action === 'kick' ? 'bg-orange-500/20 text-orange-400' : action === 'timeout' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {processing ? 'Processing...' : `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
