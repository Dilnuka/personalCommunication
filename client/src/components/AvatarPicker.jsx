import { AVATAR_PRESETS, getAvatarUrl } from '../constants/avatars';

export default function AvatarPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
      {AVATAR_PRESETS.map((preset) => {
        const selected = value === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            className={`relative rounded-full p-0.5 transition-all active:scale-95 ${
              selected
                ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-[#0f172a] scale-105'
                : 'hover:ring-2 hover:ring-slate-500/60 hover:ring-offset-1 hover:ring-offset-[#0f172a]'
            }`}
            aria-label={`Choose avatar ${preset.seed}`}
            aria-pressed={selected}
          >
            <img
              src={getAvatarUrl(preset.id)}
              alt=""
              className="w-full aspect-square rounded-full bg-slate-700/50"
              loading="lazy"
            />
          </button>
        );
      })}
    </div>
  );
}
