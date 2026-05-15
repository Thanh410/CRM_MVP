/**
 * Sinh màu HSL ổn định từ string ID/name.
 * Cùng input → luôn cùng output. Giúp mỗi user/contact có 1 màu avatar riêng.
 *
 * Dùng pastel-ish palette (saturation 55%, lightness 50%) để vừa contrast vừa dễ nhìn.
 */
export function getAvatarColor(seed: string | null | undefined): {
  bg: string;
  text: string;
  ring: string;
} {
  if (!seed) {
    return {
      bg: 'hsl(0, 0%, 90%)',
      text: 'hsl(0, 0%, 30%)',
      ring: 'hsl(0, 0%, 80%)',
    };
  }

  // Simple FNV-1a hash
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;

  return {
    bg: `hsl(${hue}, 55%, 92%)`,     // light pastel background
    text: `hsl(${hue}, 65%, 30%)`,    // dark text for AA contrast
    ring: `hsl(${hue}, 50%, 70%)`,    // subtle border
  };
}

/**
 * Inline style helper cho avatar background.
 *
 * Usage:
 *   <div style={avatarStyle(user.id)}>
 *     {initials(user.name)}
 *   </div>
 */
export function avatarStyle(seed: string | null | undefined): React.CSSProperties {
  const { bg, text } = getAvatarColor(seed);
  return { backgroundColor: bg, color: text };
}
