export function hexToRgba(hex: string, alpha = 0.3) {
  const cleaned = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return undefined;

  const n = parseInt(cleaned, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}