import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
  : 'http://localhost:3001';

function StatusDot({ active, label, sub }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500/60'} transition-colors duration-500`} />
      <div>
        <p className="text-white text-xs font-medium">{label}</p>
        {sub && <p className="text-[#555] text-[11px]">{sub}</p>}
      </div>
    </div>
  );
}

export function NexusLoading() {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-6 mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 flex items-center justify-center border border-blue-500/10">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-white font-bold text-xl tracking-tight mb-1">Nexus Security</h1>
          <p className="text-[#555] text-sm">Starting up...</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <span className="text-[#555] text-[11px] font-mono">Connecting to server...</span>
      </div>
    </div>
  );
}

function NexusError({ title, message, onRetry, details }) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mx-auto mb-6">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h1 className="text-white font-bold text-xl mb-2">Unable to Connect</h1>
        <p className="text-[#666] text-sm mb-6 leading-relaxed">{message}</p>

        <button onClick={onRetry} className="btn-primary text-sm px-6 py-2.5 mb-3 w-full justify-center">
          Retry Connection
        </button>

        {details && (
          <button onClick={() => setShowDetails(!showDetails)} className="text-[#555] text-xs hover:text-[#888] transition-colors mb-4 block mx-auto">
            {showDetails ? 'Hide diagnostics' : 'View diagnostics'}
          </button>
        )}

        {showDetails && details && (
          <div className="bg-white/[0.02] rounded-xl p-4 text-left border border-white/[0.04] space-y-2 mb-4">
            {details.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-[#888]">{d.label}</span>
                <span className={d.ok ? 'text-green-400' : 'text-red-400'}>{d.ok ? '✓' : '✗'} {d.status}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[#444] text-xs">
          The backend server (port {API_URL.replace(/^.*:/, '')}) is not responding.<br />
          Make sure the API is running.
        </p>
      </div>
    </div>
  );
}

export default function AppBoundary({ children }) {
  const [status, setStatus] = useState('loading');
  const [healthData, setHealthData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [wsStatus, setWsStatus] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const intervalRef = useRef(null);
  const wsRef = useRef(null);

  useEffect(() => { setIsClient(true); }, []);

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${API_URL}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
        setStatus('ready');
        return true;
      }
    } catch {}
    return false;
  }, []);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    try {
      const port = API_URL.replace(/^.*:/, '');
      const socket = new WebSocket(`ws://localhost:${port}`);
      socket.onopen = () => setWsStatus(true);
      socket.onclose = () => setWsStatus(false);
      socket.onerror = () => setWsStatus(false);
      wsRef.current = socket;
    } catch {}
  }, []);

  useEffect(() => {
    if (!isClient) return;
    let mounted = true;
    (async () => {
      const ok = await checkHealth();
      if (!ok && mounted) {
        intervalRef.current = setInterval(async () => {
          const ok = await checkHealth();
          if (ok && mounted) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }, 3000);
      }
    })();
    return () => { mounted = false; if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isClient, checkHealth, retryCount]);

  useEffect(() => {
    if (isClient && status === 'ready') connectWebSocket();
  }, [isClient, status, connectWebSocket]);

  if (!isClient) return <>{children}</>;

  if (status === 'loading') return <NexusLoading />;

  if (status !== 'ready') {
    return (
      <NexusError
        title="Connection Error"
        message="The Nexus API server is currently unreachable. This usually happens when the backend hasn't finished starting up."
        onRetry={() => { setStatus('loading'); setRetryCount(c => c + 1); }}
        details={[
          { label: 'API Server', ok: healthData !== null, status: healthData ? 'Online' : 'Offline' },
          { label: 'Discord Bot', ok: healthData?.bot && healthData.bot !== 'Not connected', status: healthData?.bot || 'Disconnected' },
          { label: 'WebSocket', ok: wsStatus, status: wsStatus ? 'Connected' : 'Disconnected' },
          { label: 'Auto-Retry', ok: true, status: 'Every 3 seconds' },
        ]}
      />
    );
  }

  return <>{children}</>;
}
