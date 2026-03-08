export interface GoogleFont {
  name: string;
  family: string;
  category: string;
}

export const googleFonts: GoogleFont[] = [
  { name: 'Default', family: 'PingFang SC', category: 'sans-serif' },
  { name: 'Inter', family: 'Inter', category: 'sans-serif' },
  { name: 'Roboto', family: 'Roboto', category: 'sans-serif' },
  { name: 'Lato', family: 'Lato', category: 'sans-serif' },
  { name: 'Montserrat', family: 'Montserrat', category: 'sans-serif' },
  { name: 'Oswald', family: 'Oswald', category: 'sans-serif' },
  { name: 'Playfair Display', family: 'Playfair Display', category: 'serif' },
  { name: 'Merriweather', family: 'Merriweather', category: 'serif' },
  { name: 'Nunito', family: 'Nunito', category: 'sans-serif' },
  { name: 'Inconsolata', family: 'Inconsolata', category: 'monospace' },
  { name: 'Dancing Script', family: 'Dancing Script', category: 'handwriting' },
  { name: 'Pacifico', family: 'Pacifico', category: 'handwriting' },
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
  link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@100;300;400;500;700;900&display=swap`;
  
  document.head.appendChild(link);
};
