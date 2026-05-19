import { useState, useEffect, useRef, useCallback } from 'react';
import { checkAPIStatus } from '../utils/auth';

export default function ConnectionMonitor({ children }) {
  const [state, setState] = useState('checking');
  const [retryCount, setRetryCount] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const retryRef = useRef(0);
  const stateRef = useRef('checking');

  const checkConnection = useCallback(async () => {
    try {
      const status = await checkAPIStatus();
      if (status.online) {
        setState('online');
        setRetryCount(0);
        retryRef.current = 0;
        setShowOverlay(false);
      } else {
        setState('offline');
        retryRef.current += 1;
        setRetryCount(retryRef.current);
        if (retryRef.current > 1) setShowOverlay(true);
      }
    } catch {
      setState('offline');
      retryRef.current += 1;
      setRetryCount(retryRef.current);
      if (retryRef.current > 1) setShowOverlay(true);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const iv = setInterval(checkConnection, 4000);
    return () => clearInterval(iv);
  }, [checkConnection]);

  return (
    <>
      {showOverlay && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#080808] backdrop-blur-xl" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="text-center max-w-sm px-6">
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500/10 to-purple-500/5 border border-white/[0.06] flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </div>
            </div>
            <h2 className="text-white text-lg font-bold mb-2">Connection Lost</h2>
            <p className="text-[#555] text-sm mb-6 leading-relaxed">Unable to reach the Nexus Security backend. Retrying automatically...</p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-[#555] text-xs font-mono">Retry #{retryCount}</span>
            </div>
            <button onClick={() => { retryRef.current = 0; setRetryCount(0); setShowOverlay(false); checkConnection(); }}
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm font-medium hover:bg-white/[0.07] hover:border-white/[0.12] transition-all">
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Try Now
              </span>
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}