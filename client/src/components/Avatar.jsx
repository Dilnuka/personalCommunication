import { getAvatarUrl } from '../constants/avatars';

export default function Avatar({ name, color, avatarId, size = 'md', status }) {
  const avatarUrl = getAvatarUrl(avatarId);
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const statusColors = {
    online: 'bg-green-400',
    offline: 'bg-slate-500',
    away: 'bg-yellow-400',
  };

  return (
    <div className="relative inline-flex shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className={`${sizes[size]} rounded-full object-cover bg-slate-700/50`}
        />
      ) : (
        <div
          className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white`}
          style={{ backgroundColor: color || '#6366f1' }}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1e293b] ${statusColors[status] || statusColors.offline}`}
        />
      )}
    </div>
  );
}
