export interface GoogleFont {
  name: string;
  family: string;
  category: string;
}

export const googleFonts: GoogleFont[] = [
  { name: 'Default', family: 'PingFang SC', category: 'sans-serif' },
  { name: 'Inter', family: 'Inter', category: 'sans-serif' },
  { name: 'Bebas Neue', family: 'Bebas Neue', category: 'display' },
  { name: 'Orbitron', family: 'Orbitron', category: 'sans-serif' },
  { name: 'Righteous', family: 'Righteous', category: 'display' },
  { name: 'Playfair Display', family: 'Playfair Display', category: 'serif' },
  { name: 'Abril Fatface', family: 'Abril Fatface', category: 'serif' },
  { name: 'Cormorant Garamond', family: 'Cormorant Garamond', category: 'serif' },
  { name: 'Space Mono', family: 'Space Mono', category: 'monospace' },
  { name: 'Caveat', family: 'Caveat', category: 'handwriting' },
  { name: 'Pacifico', family: 'Pacifico', category: 'handwriting' },
  { name: 'Monoton', family: 'Monoton', category: 'display' },
  { name: 'Bangers', family: 'Bangers', category: 'display' },
  { name: 'Press Start 2P', family: 'Press Start 2P', category: 'display' },
  { name: 'Pixelify Sans', family: 'Pixelify Sans', category: 'display' },
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
