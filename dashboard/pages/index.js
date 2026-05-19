import Link from 'next/link';
import Head from 'next/head';

const features = [
  { title: 'Advanced Protection', desc: 'Real-time threat detection with anti-raid, anti-link, anti-spam systems.',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
  { title: 'Live Moderation', desc: 'Ban, kick, timeout, and warn members directly from the dashboard.',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>' },
  { title: 'Real-time Analytics', desc: 'Live server statistics, member tracking, and performance metrics.',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-4"/></svg>' },
  { title: 'Audit Logging', desc: 'Comprehensive event logging with 17+ event types and searchable filters.',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' },
  { title: 'Voice Tracking', desc: 'Monitor voice channels, track join/leave times, and analyze activity.',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>' },
  { title: 'Zero Configuration', desc: 'Add the bot, log in with Discord, and start managing instantly.',
    icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#080808]">
      <Head><title>Nexus Security — Advanced Discord Protection</title></Head>

      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg overflow-hidden">
            <img src="/logo.png" alt="Nexus" className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">Nexus</span>
        </div>
        <Link href="/login" className="btn-primary text-xs px-5 py-2">Get Started</Link>
      </nav>

      <section className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 glow-green" />
            <span className="text-[#666] text-[11px] font-medium">All systems operational</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight leading-tight">
            Advanced Security for
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-[#777]">Your Discord Server</span>
          </h1>
          <p className="text-base md:text-lg text-[#666] max-w-2xl mx-auto leading-relaxed">
            Enterprise-grade protection, moderation, and analytics platform for Discord communities.
            Real-time monitoring from a premium dashboard.
          </p>
        </div>
        <div className="flex gap-3 mt-6">
          <Link href="/login" className="btn-primary text-sm px-7 py-2.5">Launch Dashboard</Link>
          <a href="https://discord.com/api/oauth2/authorize?client_id=1474696418584432763&permissions=8&scope=bot%20applications.commands" target="_blank" rel="noopener noreferrer" className="btn-secondary text-sm px-7 py-2.5">Invite Bot</a>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Enterprise Features</h2>
          <p className="text-[#666] text-sm">Everything you need to protect and manage your community</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div key={i} className="glass-card p-5">
              <div className="w-9 h-9 rounded-lg bg-white/[0.03] flex items-center justify-center text-white mb-3">{<span dangerouslySetInnerHTML={{ __html: f.icon }} />}</div>
              <h3 className="text-white font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-[#555] text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/[0.03] py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-1">
          <div className="w-4 h-4 rounded overflow-hidden">
            <img src="/logo.png" alt="" className="w-full h-full object-cover" />
          </div>
          <span className="text-white font-semibold text-xs">Nexus Security</span>
        </div>
        <p className="text-[#444] text-[11px]">&copy; {new Date().getFullYear()} Nexus Security Bot. All rights reserved.</p>
      </footer>
    </div>
  );
}
