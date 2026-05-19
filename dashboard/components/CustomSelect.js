import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = options.find(o => o.value === value);
  const display = selected ? selected.label : (placeholder || '— None —');

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className="glass-select text-xs flex items-center justify-between">
        <span className={selected ? 'text-white' : 'text-[#555]'}>{display}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-[#0d0d0d]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl animate-dropdown">
          <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${!value ? 'bg-white/[0.06] text-white' : 'text-[#666] hover:bg-white/[0.03] hover:text-white'}`}>
              — None —
            </button>
            {options.map(opt => (
              <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${value === opt.value ? 'bg-white/[0.06] text-white font-medium' : 'text-[#ccc] hover:bg-white/[0.03] hover:text-white'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}