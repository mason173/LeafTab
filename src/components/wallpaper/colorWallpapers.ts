export type ColorWallpaperPreset = {
  id: string;
  name: string;
  gradient: string;
};

export const DEFAULT_COLOR_WALLPAPER_ID = 'aurora-blush';

export const COLOR_WALLPAPER_PRESETS: ColorWallpaperPreset[] = [
  {
    id: 'aurora-blush',
    name: '极光粉雾',
    gradient: 'linear-gradient(135deg, #ff95b8 0%, #d5b4ff 46%, #89d4ff 100%)',
  },
  {
    id: 'mist-lilac',
    name: '晨雾紫',
    gradient: 'linear-gradient(135deg, #d7b6ff 0%, #a4abff 50%, #7bc4ff 100%)',
  },
  {
    id: 'mint-breeze',
    name: '薄荷风',
    gradient: 'linear-gradient(135deg, #86e9c4 0%, #7fe1d6 48%, #8fc9ff 100%)',
  },
  {
    id: 'peach-cloud',
    name: '蜜桃云',
    gradient: 'linear-gradient(135deg, #ffb08b 0%, #ffc79d 52%, #ffe1b0 100%)',
  },
  {
    id: 'glacier-milk',
    name: '冰川奶蓝',
    gradient: 'linear-gradient(135deg, #7bc2ff 0%, #9ccfff 45%, #bfdcff 100%)',
  },
  {
    id: 'rose-water',
    name: '玫瑰水',
    gradient: 'linear-gradient(135deg, #ff96b7 0%, #d7a2f5 50%, #b1b7ff 100%)',
  },
  {
    id: 'sage-cream',
    name: '鼠尾奶绿',
    gradient: 'linear-gradient(135deg, #9edb9f 0%, #c8df9e 48%, #f2d9a8 100%)',
  },
  {
    id: 'dawn-sand',
    name: '晨砂',
    gradient: 'linear-gradient(135deg, #f2c08e 0%, #f4af93 46%, #f6c8a9 100%)',
  },
  {
    id: 'lavender-snow',
    name: '薰衣雪',
    gradient: 'linear-gradient(135deg, #b9abff 0%, #cab9ff 50%, #e6d3ff 100%)',
  },
  {
    id: 'ocean-haze',
    name: '海雾',
    gradient: 'linear-gradient(135deg, #73c9ff 0%, #69dce5 45%, #89e1b6 100%)',
  },
  {
    id: 'camellia-silk',
    name: '山茶绢',
    gradient: 'linear-gradient(135deg, #f7a3a7 0%, #f5b3cd 48%, #e3bff3 100%)',
  },
  {
    id: 'tea-ivory',
    name: '茶米白',
    gradient: 'linear-gradient(135deg, #d7b88f 0%, #e3c5a2 48%, #f0dbc1 100%)',
  },
];

export const getColorWallpaperGradient = (id: string): string => {
  const preset = COLOR_WALLPAPER_PRESETS.find((item) => item.id === id) ?? COLOR_WALLPAPER_PRESETS[0];
  return preset.gradient;
};
