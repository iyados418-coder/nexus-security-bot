import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { checkAPIStatus } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiOnline, setApiOnline] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const checkApi = async () => {
    setRetrying(true);
    const status = await checkAPIStatus();
    setApiOnline(status.online);
    setRetrying(false);
  };

  useEffect(() => {
    checkApi();
    const iv = setInterval(checkApi, 10000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (router.query.error) {
      const msgs = { auth_failed: 'Authentication failed. Please try again.', no_code: 'No authorization code received.', invalid_credentials: 'Discord credentials are invalid. Check your .env configuration.' };
      setError(msgs[router.query.error] || router.query.error.replace(/_/g, ' '));
    }
  }, [router.query]);

  const handleLogin = () => {
    setLoading(true);
    setError('');
    window.location.href = `${API_URL}/api/auth/discord`;
  };

  if (apiOnline === false) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="glass-card p-10 w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center mx-auto mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-[#666] text-sm mb-6">The API server is not responding. Make sure the bot and API are running on port 3001.</p>
          <div className="space-y-3">
            <button onClick={checkApi} disabled={retrying} className="btn-primary w-full justify-center">
              {retrying ? 'Checking...' : 'Retry Connection'}
            </button>
            <Link href="/" className="btn-secondary w-full justify-center">Back to Home</Link>
          </div>
          <p className="text-[#444] text-xs mt-4">Auto-retrying every 10 seconds...</p>
        </div>
      </div>
    );
  }

  if (apiOnline === null) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="glass-card p-10 w-full max-w-md text-center">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-sm">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="glass-card p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl overflow-hidden">
              <img src="/logo.png" alt="Nexus" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Nexus</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-[#666] text-sm">Sign in to manage your servers</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-[#0a0a0a] font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
          )}
          {loading ? 'Redirecting...' : 'Continue with Discord'}
        </button>

        <p className="text-[#444] text-xs text-center mt-6 leading-relaxed">
          By continuing, you authorize Nexus Security to access your Discord account and servers.
        </p>
      </div>
    </div>
  );
}
