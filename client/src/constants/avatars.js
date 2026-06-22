/** DiceBear Personas — flat illustrated avatars (https://www.dicebear.com/styles/personas/) */
export const AVATAR_STYLE = 'personas';

export const AVATAR_PRESETS = [
  { id: 'p01', seed: 'Aneka', background: 'c0aede' },
  { id: 'p02', seed: 'Brian', background: 'b6e3f4' },
  { id: 'p03', seed: 'Christopher', background: 'ffd5dc' },
  { id: 'p04', seed: 'Destiny', background: 'ffdfbf' },
  { id: 'p05', seed: 'Emery', background: 'd1d4f9' },
  { id: 'p06', seed: 'Finley', background: 'c0aede' },
  { id: 'p07', seed: 'Harper', background: 'b6e3f4' },
  { id: 'p08', seed: 'Jessica', background: 'ffd5dc' },
  { id: 'p09', seed: 'Kai', background: 'c1f0c1' },
  { id: 'p10', seed: 'Liliana', background: 'ffdfbf' },
  { id: 'p11', seed: 'Maria', background: 'd1d4f9' },
  { id: 'p12', seed: 'Noah', background: 'b6e3f4' },
  { id: 'p13', seed: 'Oliver', background: 'c0aede' },
  { id: 'p14', seed: 'Priya', background: 'ffd5dc' },
  { id: 'p15', seed: 'Quinn', background: 'c1f0c1' },
  { id: 'p16', seed: 'Riley', background: 'ffdfbf' },
  { id: 'p17', seed: 'Sasha', background: 'd1d4f9' },
  { id: 'p18', seed: 'Taylor', background: 'b6e3f4' },
  { id: 'p19', seed: 'Uma', background: 'ffd5dc' },
  { id: 'p20', seed: 'Victor', background: 'c0aede' },
  { id: 'p21', seed: 'Willow', background: 'c1f0c1' },
  { id: 'p22', seed: 'Xavier', background: 'ffdfbf' },
  { id: 'p23', seed: 'Yasmin', background: 'd1d4f9' },
  { id: 'p24', seed: 'Zoe', background: 'b6e3f4' },
  { id: 'p25', seed: 'Alex', background: 'ffd5dc' },
];

export const DEFAULT_AVATAR_ID = 'p01';

export function getAvatarPreset(avatarId) {
  return AVATAR_PRESETS.find((p) => p.id === avatarId) || AVATAR_PRESETS[0];
}

export function getAvatarUrl(avatarId) {
  if (!avatarId) return null;
  const preset = getAvatarPreset(avatarId);
  const params = new URLSearchParams({
    seed: preset.seed,
    backgroundColor: preset.background,
  });
  return `https://api.dicebear.com/9.x/${AVATAR_STYLE}/svg?${params}`;
}

export function randomAvatarId() {
  return AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)].id;
}
