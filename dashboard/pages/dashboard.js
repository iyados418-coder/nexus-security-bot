import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/Layout';
import { authFetch, setToken, getToken, clearToken } from '../utils/auth';

function StatCard({ label, value, sub, icon, color, glow, delay }) {
  return (
    <div className={`card-premium p-4 hover-lift animate-fadeInUp ${delay || ''}`}
      style={{ animationDelay: delay || '0s' }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[#555] text-[10px] font-semibold uppercase tracking-widest">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${color || 'bg-white/[0.03]'} flex items-center justify-center ${glow || ''}`} dangerouslySetInnerHTML={{ __html: icon }} />
      </div>
      <p className="stat-value">{value}</p>
      {sub && <p className="text-[#555] text-[11px] mt-1 font-medium">{sub}</p>}
    </div>
  );
}

function ServerCard({ guild }) {
  const iconUrl = guild.iconURL || guild.icon;
  return (
    <Link href={`/servers/${guild.id}`} className="glass-card p-4 flex items-center gap-3 hover:border-white/[0.12] transition-all group">
      <div className="w-10 h-10 rounded-xl bg-white/[0.05] overflow-hidden flex-shrink-0">
        {iconUrl ? <img src={iconUrl} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-semibold text-white">{guild.name?.charAt(0)}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium group-hover:text-white/80 transition-colors truncate">{guild.name}</p>
        <p className="text-[#555] text-xs">{guild.memberCount || 0} members</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" className="group-hover:stroke-white transition-colors"><path d="M9 18l6-6-6-6"/></svg>
    </Link>
  );
}

function Skeleton() {
  return <div className="glass-card p-4"><div className="skeleton h-12 w-full" /></div>;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !router.isReady) return;
    handled.current = true;
    (async () => {
      const { token } = router.query;
      if (token && token.length > 10) {
        setToken(token);
        window.history.replaceState({}, '', '/dashboard');
        window.location.reload();
        return;
      }
      const stored = getToken();
      if (!stored) { window.location.href = '/login'; return; }
      const r = await authFetch('/api/auth/me');
      if (r.status === 503) { setError('API server is offline'); setLoading(false); return; }
      if (!r.ok) { clearToken(); window.location.href = '/login'; return; }
      let d;
      try { d = await r.json(); } catch { clearToken(); window.location.href = '/login'; return; }
      if (!d.authenticated) { clearToken(); window.location.href = '/login'; return; }
      setUser(d.user);
      try {
        const [gr, sr] = await Promise.all([authFetch('/api/guilds'), authFetch('/api/stats')]);
        if (gr.ok) { const gd = await gr.json(); setGuilds(gd.guilds || gd || []); }
        if (sr.ok) { const sd = await sr.json(); setStats(sd.stats || sd); }
      } catch (e) { setError('Failed to load data'); }
      setLoading(false);
    })();
  }, [router.isReady]);

  const tab = router.query.tab || '';

  const totalMembers = stats?.users || guilds.reduce((s, g) => s + (g.memberCount || 0), 0);
  const ping = stats?.ping || 0;
  const uptime = stats?.uptime || 0;
  const uptimeStr = uptime > 86400 ? `${Math.floor(uptime/86400)}d ${Math.floor((uptime%86400)/3600)}h` : uptime > 3600 ? `${Math.floor(uptime/3600)}h ${Math.floor((uptime%3600)/60)}m` : uptime > 60 ? `${Math.floor(uptime/60)}m ${uptime%60}s` : `${uptime}s`;

  if (loading) {
    return (
      <Layout guild={null}>
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="skeleton h-6 w-40" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} />)}
          </div>
          <div className="skeleton h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (error && !user) {
    return (
      <Layout guild={null}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <p className="text-white font-semibold text-sm mb-1">Unable to load dashboard</p>
            <p className="text-[#555] text-xs mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary text-xs">Retry</button>
          </div>
        </div>
      </Layout>
    );
  }

  // Bot Status Tab
  if (tab === 'botstatus') {
    return (
      <Layout guild={null}>
        <div className="max-w-4xl mx-auto space-y-5">
          <h1 className="text-lg font-bold text-white">Bot Status</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Status" value={stats ? 'Online' : 'Offline'} color="bg-green-500/10 text-green-400"
              icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' />
            <StatCard label="Servers" value={stats?.servers || 0} color="bg-blue-500/10 text-blue-400"
              icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>' />
            <StatCard label="Ping" value={`${ping}ms`} color="bg-purple-500/10 text-purple-400"
              icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' />
            <StatCard label="Uptime" value={uptimeStr} color="bg-white/[0.03]"
              icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' />
          </div>
          <div className="glass-card p-5">
            <h2 className="text-white font-semibold text-sm mb-1">System Information</h2>
            <p className="text-[#555] text-xs mb-4">Real-time bot performance metrics</p>
            <div className="space-y-2">
              {[{ l: 'Bot Status', v: stats ? 'Operational' : 'Offline', c: stats ? 'text-green-400' : 'text-red-400' },
                { l: 'API Server', v: 'Running', c: 'text-green-400' },
                { l: 'WebSocket', v: stats ? 'Connected' : 'Disconnected', c: stats ? 'text-green-400' : 'text-red-400' },
                { l: 'Active Guilds', v: stats?.servers || 0, c: 'text-white' },
                { l: 'Total Users', v: totalMembers, c: 'text-white' },
                { l: 'Commands Loaded', v: stats?.commands || 0, c: 'text-white' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/[0.02]">
                  <span className="text-[#666] text-xs">{item.l}</span>
                  <span className={`text-xs font-medium ${item.c}`}>{item.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Servers Tab
  if (tab === 'servers') {
    return (
      <Layout guild={null}>
        <div className="max-w-6xl mx-auto space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-white">Your Servers</h1>
            <p className="text-[#555] text-xs">{guilds.length} server{guilds.length !== 1 ? 's' : ''}</p>
          </div>
          {guilds.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>
              </div>
              <p className="text-white font-medium text-sm mb-1">No servers found</p>
              <p className="text-[#555] text-xs">Make sure the bot is in your server and you have admin permissions.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guilds.map(g => <ServerCard key={g.id} guild={g} />)}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Analytics Tab
  if (tab === 'analytics') {
    return (
      <Layout guild={null}>
        <div className="max-w-6xl mx-auto space-y-5">
          <h1 className="text-lg font-bold text-white">Analytics</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Servers" value={stats?.servers || 0}
              icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/></svg>' />
            <StatCard label="Total Users" value={totalMembers}
              icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' />
            <StatCard label="Channels" value={stats?.channels || 0}
              icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' />
            <StatCard label="Bot Ping" value={`${ping}ms`}
              icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' />
          </div>
          <div className="glass-card p-5">
            <h2 className="text-white font-semibold text-sm mb-1">Commands</h2>
            <p className="text-[#555] text-xs mb-3">Available slash commands across all servers</p>
            <p className="text-3xl font-bold text-white">{stats?.commands || 0}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Moderation Tab
  if (tab === 'moderation') {
    return (
      <Layout guild={null}>
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p className="text-white font-medium text-sm mb-1">Select a Server</p>
            <p className="text-[#555] text-xs mb-4">Choose a server from the sidebar to manage moderation.</p>
            <Link href="/dashboard?tab=servers" className="btn-primary text-xs">View Servers</Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Logs Tab
  if (tab === 'logs') {
    return (
      <Layout guild={null}>
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <p className="text-white font-medium text-sm mb-1">Select a Server</p>
            <p className="text-[#555] text-xs mb-4">Choose a server from the sidebar to view its logs.</p>
            <Link href="/dashboard?tab=servers" className="btn-primary text-xs">View Servers</Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Voice Tab
  if (tab === 'voice') {
    return (
      <Layout guild={null}>
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
            </div>
            <p className="text-white font-medium text-sm mb-1">Select a Server</p>
            <p className="text-[#555] text-xs mb-4">Choose a server from the sidebar to view voice activity.</p>
            <Link href="/dashboard?tab=servers" className="btn-primary text-xs">View Servers</Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Members Tab
  if (tab === 'members') {
    return (
      <Layout guild={null}>
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <p className="text-white font-medium text-sm mb-1">Select a Server</p>
            <p className="text-[#555] text-xs mb-4">Choose a server from the sidebar to view members.</p>
            <Link href="/dashboard?tab=servers" className="btn-primary text-xs">View Servers</Link>
          </div>
        </div>
      </Layout>
    );
  }

  // Main Overview
  return (
    <Layout guild={null}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Overview</h1>
            <p className="text-[#555] text-xs mt-0.5 font-medium">Welcome{user ? `, ${user.username}` : ''} &mdash; Nexus is active and monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${stats ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className={`text-[11px] font-medium ${stats ? 'text-green-400' : 'text-red-400'}`}>{stats ? 'System Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Servers" value={stats?.servers || guilds.length}
            icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>' color="bg-blue-500/10 text-blue-400" glow="glow-blue" delay="stagger-1" />
          <StatCard label="Total Users" value={totalMembers.toLocaleString()}
            icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' color="bg-purple-500/10 text-purple-400" glow="glow-purple" delay="stagger-2" />
          <StatCard label="Ping" value={`${ping}ms`}
            icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' color="bg-green-500/10 text-green-400" glow="glow-green" delay="stagger-3" />
          <StatCard label="Uptime" value={uptimeStr}
            icon='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' color="bg-white/[0.03] text-white/60" glow="glow-blue" delay="stagger-4" />
        </div>

        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Quick Access</h2>
              <p className="text-[#555] text-xs mt-0.5">Jump to any management section</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: '/dashboard?tab=servers', label: 'Servers', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>', color: 'text-blue-400' },
              { href: '/dashboard?tab=analytics', label: 'Analytics', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-4"/></svg>', color: 'text-purple-400' },
              { href: '/dashboard?tab=botstatus', label: 'Bot Status', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>', color: 'text-green-400' },
              { href: '/login', label: 'Settings', icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>', color: 'text-white/60' },
            ].map((item, i) => (
              <Link key={i} href={item.href} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] hover:border-blue-500/20 transition-all border border-transparent group">
                <div className={`w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>{<span dangerouslySetInnerHTML={{ __html: item.icon }} />}</div>
                <span className="text-white text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card-premium p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Your Servers</h2>
              <p className="text-[#555] text-xs mt-0.5">{guilds.length} server{guilds.length !== 1 ? 's' : ''} available &mdash; select to manage</p>
            </div>
            {guilds.length > 0 && <Link href="/dashboard?tab=servers" className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">View all &rarr;</Link>}
          </div>
          {guilds.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/></svg>
              </div>
              <p className="text-white font-medium text-sm mb-1">No servers found</p>
              <p className="text-[#555] text-xs max-w-xs mx-auto">Make sure the bot is in your server and you have administrator permissions.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {guilds.slice(0, 6).map((g, i) => (
                <Link key={g.id} href={`/servers/${g.id}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.02] transition-all group hover-lift">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.02] overflow-hidden flex-shrink-0 border border-white/[0.04] group-hover:border-blue-500/20 transition-all">
                    {g.iconURL || g.icon ? <img src={g.iconURL || g.icon} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">{g.name?.charAt(0)}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate group-hover:text-blue-300 transition-colors">{g.name}</p>
                    <p className="text-[#555] text-xs">{g.memberCount || 0} members</p>
                  </div>
                  <span className="text-[#555] text-[10px] font-medium bg-white/[0.03] px-2 py-1 rounded-md">{g.memberCount || 0}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" className="group-hover:stroke-blue-400 transition-colors"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
