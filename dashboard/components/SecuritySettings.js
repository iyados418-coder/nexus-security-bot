import { useState, useEffect } from 'react';
import { FiShield, FiLink, FiMessageSquare, FiColumns, FiUsers, FiServer, FiAlertTriangle } from 'react-icons/fi';
import { authFetch } from '../utils/auth';

const defaultSettings = {
  antiLink: { label: 'Anti-Link', desc: 'Block Discord invite links and suspicious URLs', icon: <FiLink size={18} /> },
  antiSpam: { label: 'Anti-Spam', desc: 'Detect and block spam messages automatically', icon: <FiMessageSquare size={18} /> },
  antiMassChannel: { label: 'Anti-Mass Channel', desc: 'Prevent mass channel creation/deletion', icon: <FiColumns size={18} /> },
  antiMassRole: { label: 'Anti-Mass Role', desc: 'Prevent mass role assignment', icon: <FiUsers size={18} /> },
  antiWebhookSpam: { label: 'Anti-Webhook Spam', desc: 'Detect and block webhook abuse', icon: <FiServer size={18} /> },
  antiRaid: { label: 'Anti-Raid', desc: 'Automatic raid detection and lockdown', icon: <FiAlertTriangle size={18} /> },
};

export default function SecuritySettings({ guildId }) {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!guildId) return;
    const fetchSettings = async () => {
      try {
        const res = await authFetch(`/api/settings/${guildId}`);
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings || {});
        }
      } catch (e) {}
      setLoading(false);
    };
    fetchSettings();
  }, [guildId]);

  const toggle = async (key) => {
    const newVal = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newVal }));
    setSaving(key);
    setFeedback('');

    try {
      const res = await authFetch(`/api/settings/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newVal }),
      });

      if (!res.ok) {
        setSettings((prev) => ({ ...prev, [key]: !newVal }));
        setFeedback('Failed to save');
      } else {
        setFeedback('Saved');
        setTimeout(() => setFeedback(''), 2000);
      }
    } catch (e) {
      setSettings((prev) => ({ ...prev, [key]: !newVal }));
      setFeedback('Error saving');
    }
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-white font-semibold mb-4">Security Settings</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-white/5 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiShield className="text-red-500" size={20} />
          <h3 className="text-white font-semibold">Security Settings</h3>
        </div>
        {feedback && (
          <span className={`text-sm ${feedback === 'Saved' ? 'text-green-400' : 'text-red-400'}`}>
            {feedback}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {Object.entries(defaultSettings).map(([key, def]) => (
          <div
            key={key}
            className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-all"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <span className="text-red-500 mt-0.5 shrink-0">{def.icon}</span>
              <div>
                <p className="text-white text-sm font-medium">{def.label}</p>
                <p className="text-gray-500 text-xs">{def.desc}</p>
              </div>
            </div>
            <label className="relative shrink-0 ml-3">
              <input
                type="checkbox"
                checked={!!settings[key]}
                onChange={() => toggle(key)}
                disabled={saving === key}
                className="toggle-checkbox"
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
