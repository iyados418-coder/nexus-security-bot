import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { io } from 'socket.io-client';
import { authFetch, clearToken, checkAPIStatus } from '../utils/auth';
import ConnectionMonitor from './ConnectionMonitor';

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const navSections = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>' },
      { href: '/dashboard?tab=analytics', label: 'Analytics', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-4"/></svg>' },
    ],
  },
  {
    label: 'Management',
    items: [
      { href: '/dashboard?tab=servers', label: 'Servers', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>' },
      { href: '/dashboard?tab=moderation', label: 'Moderation', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
      { href: '/dashboard?tab=logs', label: 'Logs', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
    ],
  },
  {
    label: 'Monitoring',
    items: [
      { href: '/dashboard?tab=voice', label: 'Voice', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>' },
      { href: '/dashboard?tab=members', label: 'Members', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
      { href: '/dashboard?tab=botstatus', label: 'Bot Status', icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' },
    ],
  },
];

function SvgIcon({ html }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function Layout({ children, guild }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [botStatus, setBotStatus] = useState('offline');
  const [showServerList, setShowServerList] = useState(false);
  const fetched = useRef(false);
  const serverListRef = useRef(null);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    (async () => {
      try {
        const r = await authFetch('/api/auth/me');
        if (r.ok) {
          const d = await r.json();
          if (d.authenticated) {
            setUser(d.user);
            if (d.user.guilds) setGuilds(d.user.guilds);
          }
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const checkBot = async () => {
      const status = await checkAPIStatus();
      setBotStatus(status.online ? 'online' : 'offline');
    };
    checkBot();
    const iv = setInterval(checkBot, 15000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (serverListRef.current && !serverListRef.current.contains(e.target)) setShowServerList(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // WebSocket: keep guild list in sync when bot joins/leaves servers
  useEffect(() => {
    if (!user) return;
    const socket = io(WS_URL, { path: '/api/socket', transports: ['websocket', 'polling'] });

    socket.on('guildJoin', (guild) => {
      setGuilds(prev => {
        if (prev.find(g => g.id === guild.id)) return prev;
        return [guild, ...prev];
      });
    });

    socket.on('guildLeave', (guild) => {
      setGuilds(prev => prev.filter(g => g.id !== guild.id));
    });

    socket.on('guildsUpdate', (updatedGuilds) => {
      if (Array.isArray(updatedGuilds)) setGuilds(updatedGuilds);
    });

    return () => { socket.disconnect(); };
  }, [user]);

  const handleLogout = () => { clearToken(); window.location.href = '/'; };

  const isActive = (href) => {
    if (href === '/dashboard') return router.pathname === '/dashboard' && !router.query.tab;
    if (href.includes('?')) return router.query.tab === href.split('=')[1];
    return false;
  };

  const currentGuild = guild || (guilds.length === 1 ? guilds[0] : null);

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-60';

  return (
    <ConnectionMonitor>
    <div className="min-h-screen bg-[#080808] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed md:relative z-40 h-full bg-gradient-to-b from-[#0a0a0a] to-[#080808] border-r border-white/[0.03] transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'w-16' : 'w-60'} ${sidebarOpen ? 'left-0' : sidebarCollapsed ? '-left-16 md:left-0' : '-left-60 md:left-0'}`}>
        {/* Logo */}
        <div className={`flex items-center border-b border-white/[0.03] transition-all duration-300 ${sidebarCollapsed ? 'justify-center px-0 py-4' : 'px-4 py-4'}`}>
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className={`rounded-lg overflow-hidden flex-shrink-0 ${sidebarCollapsed ? 'w-8 h-8' : 'w-7 h-7'}`}>
              <img src="/logo.png" alt="Nexus" className="w-full h-full object-cover" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-white text-sm tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text">Nexus</span>
            )}
          </Link>
          {!sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(true)} className="ml-auto text-[#444] hover:text-white transition-colors p-1 hidden md:block">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}
        </div>

        {/* Server Selector */}
        <div className={`${sidebarCollapsed ? 'px-2 py-2' : 'px-2.5 pt-3 pb-1'}`} ref={serverListRef}>
          {sidebarCollapsed ? (
            <div className="relative">
              <button onClick={() => setShowServerList(!showServerList)}
                className="w-full flex items-center justify-center py-2 rounded-lg hover:bg-white/[0.04] transition-all group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center text-sm font-bold text-white overflow-hidden group-hover:border-blue-500/40 transition-all">
                  {currentGuild?.icon ? (
                    <img src={currentGuild.icon} alt="" className="w-full h-full object-cover" />
                  ) : currentGuild ? (
                    currentGuild.name?.charAt(0)?.toUpperCase()
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                  )}
                </div>
              </button>
              {showServerList && guilds.length > 0 && (
                <div className="absolute left-full ml-2 top-0 min-w-[220px] bg-[#0d0d0d]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl py-1.5 z-50 animate-dropdown">
                  <Link href="/dashboard" onClick={() => setShowServerList(false)}
                    className="flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-all">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                    </div>
                    <span className="text-xs text-white font-medium">All Servers</span>
                  </Link>
                  {guilds.map(g => (
                    <Link key={g.id} href={`/servers/${g.id}`} onClick={() => setShowServerList(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.04] transition-all ${g.id === currentGuild?.id ? 'bg-blue-500/5' : ''}`}>
                      <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center text-xs font-semibold text-white overflow-hidden flex-shrink-0">
                        {g.iconURL || g.icon ? <img src={g.iconURL || g.icon} alt="" className="w-full h-full object-cover" /> : g.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="text-xs text-white truncate flex-1">{g.name}</span>
                      <span className="text-[#555] text-[10px]">{g.memberCount || '?'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <button onClick={() => setShowServerList(!showServerList)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-all text-left group">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-600/5 border border-blue-500/10 flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0 group-hover:border-blue-500/30 transition-all">
                  {currentGuild?.icon ? (
                    <img src={currentGuild.icon} alt="" className="w-full h-full object-cover" />
                  ) : currentGuild ? (
                    currentGuild.name?.charAt(0)?.toUpperCase()
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{currentGuild?.name || 'All Servers'}</p>
                  <p className="text-[#555] text-[10px] truncate">{currentGuild ? `${currentGuild.memberCount || 0} members` : 'Select server'}</p>
                </div>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" className={`transition-transform ${showServerList ? 'rotate-180' : ''}`}><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {showServerList && guilds.length > 0 && (
                <div className="mt-1 mx-0.5 bg-[#0d0d0d]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl max-h-48 overflow-y-auto animate-dropdown">
                  <Link href="/dashboard" onClick={() => setShowServerList(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 hover:bg-white/[0.03] transition-all ${!currentGuild ? 'bg-blue-500/5' : ''}`}>
                    <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>
                    </div>
                    <span className="text-xs text-white truncate flex-1">All Servers</span>
                  </Link>
                  {guilds.map(g => (
                    <Link key={g.id} href={`/servers/${g.id}`} onClick={() => setShowServerList(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 hover:bg-white/[0.03] transition-all ${g.id === currentGuild?.id ? 'bg-blue-500/5' : ''}`}>
                      <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center text-[10px] font-semibold text-white overflow-hidden flex-shrink-0">
                        {g.iconURL || g.icon ? <img src={g.iconURL || g.icon} alt="" className="w-full h-full object-cover" /> : g.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span className="text-xs text-white truncate flex-1">{g.name}</span>
                      <span className="text-[#555] text-[10px]">{g.memberCount || '?'}</span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Navigation */}
        {sidebarCollapsed ? (
          <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-1">
            {navSections.flatMap(s => s.items).map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-200 relative group ${
                    active ? 'text-white bg-blue-500/10 border border-blue-500/20' : 'text-[#555] hover:text-white hover:bg-white/[0.03]'
                  }`}>
                  <SvgIcon html={item.icon} />
                  <div className="absolute left-full ml-2 px-2 py-1 bg-[#0a0a0a] border border-white/[0.06] rounded-lg text-xs text-white whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                    {item.label}
                  </div>
                  {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500 rounded-full" />}
                </Link>
              );
            })}
          </nav>
        ) : (
          <nav className="flex-1 px-2.5 py-3 overflow-y-auto space-y-4">
            {navSections.map((section, si) => (
              <div key={si}>
                <p className="px-2.5 text-[10px] font-semibold text-[#444] uppercase tracking-widest mb-1.5">{section.label}</p>
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-200 relative group ${
                        active ? 'text-white bg-gradient-to-r from-blue-500/10 to-transparent border-l-2 border-blue-500' : 'text-[#555] hover:text-white hover:bg-white/[0.02]'
                      }`}>
                      <SvgIcon html={item.icon} />
                      <span className="text-xs font-medium">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        )}

        {/* Collapse toggle for expanded sidebar */}
        {!sidebarCollapsed && (
          <div className="px-2.5 py-1">
            <button onClick={() => setSidebarCollapsed(true)} className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[#444] hover:text-white hover:bg-white/[0.02] transition-all text-xs">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              Collapse
            </button>
          </div>
        )}

        {/* Expand toggle for collapsed sidebar */}
        {sidebarCollapsed && (
          <div className="px-2 py-1">
            <button onClick={() => setSidebarCollapsed(false)}
              className="w-full flex items-center justify-center py-1.5 rounded-lg text-[#444] hover:text-white hover:bg-white/[0.02] transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* User Profile */}
        {user && (
          <div className={`border-t border-white/[0.03] ${sidebarCollapsed ? 'px-2 py-2' : 'px-3 py-3'}`}>
            {sidebarCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-white/[0.05] overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">{user.username?.charAt(0)?.toUpperCase()}</div>
                  )}
                </div>
                <span className={`status-dot ${botStatus}`} />
              </div>
            ) : (
              <div className="flex items-center gap-2.5 px-2.5 py-2">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-white/[0.05] overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-semibold text-white">{user.username?.charAt(0)?.toUpperCase()}</div>
                    )}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0a] ${botStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate">{user.username}</p>
                  <p className="text-[#555] text-[10px] truncate flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${botStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                    {botStatus === 'online' ? 'Connected' : 'Offline'}
                  </p>
                </div>
                <button onClick={handleLogout} className="text-[#444] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/[0.04]" title="Logout">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="sticky top-0 z-20 bg-[#080808]/80 backdrop-blur-xl px-4 md:px-6 py-3 flex items-center justify-between border-b border-white/[0.03]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-[#555] hover:text-white transition-colors md:hidden">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            {currentGuild && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/5 border border-blue-500/10 overflow-hidden flex-shrink-0 hidden md:block">
                  {currentGuild.icon ? (
                    <img src={currentGuild.icon} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">{currentGuild.name?.charAt(0)?.toUpperCase()}</div>
                  )}
                </div>
                <div>
                  <h1 className="text-white font-bold text-sm">{currentGuild.name}</h1>
                  <p className="text-[#555] text-[10px]">Server overview</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${botStatus === 'online' ? 'bg-green-500/5 border border-green-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
              <span className={`w-2 h-2 rounded-full ${botStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={`text-[11px] font-medium ${botStatus === 'online' ? 'text-green-400' : 'text-red-400'}`}>{botStatus === 'online' ? 'Connected' : 'Offline'}</span>
            </div>
            {user && (
              <div className="md:hidden w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/10 border border-white/[0.05] overflow-hidden">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-white font-bold">{user.username?.charAt(0)}</div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
    </ConnectionMonitor>
  );
}
