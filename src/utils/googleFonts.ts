export interface GoogleFont {
  name: string;
  family: string;
  category: string;
  timeScale?: number;
}

export const googleFonts: GoogleFont[] = [
  { name: 'Default', family: 'Pacifico', category: 'handwriting', timeScale: 1 },
  { name: 'PingFang SC', family: 'PingFang SC', category: 'sans-serif', timeScale: 1 },
  { name: 'Inter', family: 'Inter', category: 'sans-serif', timeScale: 1 },
  { name: 'Bebas Neue', family: 'Bebas Neue', category: 'display', timeScale: 0.92 },
  { name: 'Orbitron', family: 'Orbitron', category: 'sans-serif', timeScale: 0.94 },
  { name: 'Righteous', family: 'Righteous', category: 'display', timeScale: 0.95 },
  { name: 'Playfair Display', family: 'Playfair Display', category: 'serif', timeScale: 0.94 },
  { name: 'Abril Fatface', family: 'Abril Fatface', category: 'serif', timeScale: 0.9 },
  { name: 'Cormorant Garamond', family: 'Cormorant Garamond', category: 'serif', timeScale: 0.96 },
  { name: 'Space Mono', family: 'Space Mono', category: 'monospace', timeScale: 0.9 },
  { name: 'Caveat', family: 'Caveat', category: 'handwriting', timeScale: 0.96 },
  { name: 'Monoton', family: 'Monoton', category: 'display', timeScale: 0.84 },
  { name: 'Bangers', family: 'Bangers', category: 'display', timeScale: 0.9 },
  { name: 'Audiowide', family: 'Audiowide', category: 'display', timeScale: 0.9 },
  { name: 'Pixelify Sans', family: 'Pixelify Sans', category: 'display', timeScale: 0.86 },
];

export const loadGoogleFont = (fontFamily: string) => {
  if (fontFamily === 'PingFang SC' || !fontFamily) return;

  const linkId = `google-font-${fontFamily.replace(/\s+/g, '-').toLowerCase()}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  // Use the generic CSS2 family URL for better compatibility across display/handwriting fonts.
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}&display=swap`;
  
  document.head.appendChild(link);
};

export const toCssFontFamily = (fontFamily: string) => {
  const trimmed = fontFamily?.trim();
  if (!trimmed) return 'inherit';
  const escaped = trimmed.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
};

export const getTimeFontScale = (fontFamily: string) => {
  const trimmed = fontFamily?.trim();
  if (!trimmed) return 1;
  return googleFonts.find((font) => font.family === trimmed)?.timeScale ?? 1;
};
