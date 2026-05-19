import { useState, useEffect } from 'react';

export default function StatsCard({ icon, label, value, subtext, color = 'red' }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const accent = color === 'red' ? 'border-red-500' :
    color === 'green' ? 'border-green-500' :
    color === 'blue' ? 'border-blue-500' :
    color === 'purple' ? 'border-purple-500' : 'border-red-500';

  return (
    <div
      className={`glass-card p-5 transition-all duration-500 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {subtext && <p className="text-gray-500 text-xs mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 rounded-lg bg-opacity-10 bg-red-500 text-red-500 ${accent.replace('border', 'bg').replace('500', '500/10')}`}>
          {icon}
        </div>
      </div>
      <div className={`mt-3 h-0.5 w-full rounded-full bg-gradient-to-r from-transparent via-${accent.replace('border-', '')} to-transparent opacity-30`} />
    </div>
  );
}
