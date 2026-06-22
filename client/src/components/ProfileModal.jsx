import { useState } from 'react';
import Avatar from './Avatar';
import AvatarPicker from './AvatarPicker';
import Toggle from './Toggle';
import { useNotifications } from '../context/NotificationContext';
import { randomAvatarId } from '../constants/avatars';

export default function ProfileModal({ user, onClose, onSave }) {
  const {
    settings,
    updateSettings,
    enableBrowserNotifications,
    notificationPermission,
    testSound,
  } = useNotifications();

  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [statusMessage, setStatusMessage] = useState(user.statusMessage || '');
  const [avatarId, setAvatarId] = useState(user.avatarId || randomAvatarId());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleBrowserToggle(enabled) {
    if (enabled) {
      const ok = await enableBrowserNotifications();
      if (!ok) setError('Browser notifications blocked. Enable them in browser settings.');
    } else {
      updateSettings({ browserNotifications: false });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSave({
        displayName: displayName.trim(),
        statusMessage: statusMessage.trim(),
        avatarId,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md bg-[#1e293b] rounded-t-2xl sm:rounded-2xl border border-slate-700/50 shadow-2xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-700/50 sticky top-0 bg-[#1e293b] z-10">
          <h2 className="text-lg font-semibold text-white">Profile & settings</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-4">
            <Avatar
              name={displayName || user.displayName}
              color={user.avatarColor}
              avatarId={avatarId}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-white font-medium truncate">@{user.username}</p>
              <p className="text-sm text-slate-400 truncate">{user.email}</p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
          )}

          <div className="space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Profile</h3>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Profile picture</label>
              <AvatarPicker value={avatarId} onChange={setAvatarId} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Status message</label>
              <input
                type="text"
                value={statusMessage}
                onChange={(e) => setStatusMessage(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={100}
                className="w-full px-4 py-2.5 bg-[#0f172a] border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
            </div>
          </div>

          <div className="space-y-1 p-4 bg-[#0f172a]/60 rounded-xl border border-slate-700/40">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Sounds & notifications</h3>
            <Toggle
              label="Message sounds"
              description="Play a chime for new messages"
              enabled={settings.messageSounds}
              onChange={(v) => updateSettings({ messageSounds: v })}
            />
            <Toggle
              label="Call sounds"
              description="Ringtone for incoming and outgoing calls"
              enabled={settings.callSounds}
              onChange={(v) => updateSettings({ callSounds: v })}
            />
            <Toggle
              label="Browser notifications"
              description={
                notificationPermission === 'denied'
                  ? 'Blocked in browser — enable in site settings'
                  : 'Alerts when tab is in background'
              }
              enabled={settings.browserNotifications && notificationPermission === 'granted'}
              onChange={handleBrowserToggle}
            />
            <div className="flex gap-2 pt-3 border-t border-slate-700/40 mt-3">
              <button
                type="button"
                onClick={() => testSound('message')}
                className="flex-1 text-xs py-2 px-3 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Test message
              </button>
              <button
                type="button"
                onClick={() => testSound('call')}
                className="flex-1 text-xs py-2 px-3 rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                Test ringtone
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold rounded-xl transition"
          >
            {loading ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
