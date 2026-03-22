import cloudyVideo from '@/assets/weather/Cloudy.webm';
import foggyVideo from '@/assets/weather/Foggy day.webm';
import sunnyVideo from '@/assets/weather/Sunny day.webm';
import thunderstormVideo from '@/assets/weather/Thunderstorm.webm';
import rainingVideo from '@/assets/weather/raining.webm';
import snowingVideo from '@/assets/weather/snowing.webm';

export const sunnyWeatherVideo = sunnyVideo;

export const WEATHER_PREVIEW_VIDEOS = {
  sunny: sunnyVideo,
  cloudy: cloudyVideo,
  foggy: foggyVideo,
  rainy: rainingVideo,
  snowy: snowingVideo,
  thunderstorm: thunderstormVideo,
} as const;

export const weatherVideoMap: Record<number, string> = {
  0: sunnyVideo,
  1: sunnyVideo,
  2: cloudyVideo,
  3: cloudyVideo,
  45: foggyVideo,
  48: foggyVideo,
  51: rainingVideo,
  53: rainingVideo,
  55: rainingVideo,
  56: rainingVideo,
  57: rainingVideo,
  61: rainingVideo,
  63: rainingVideo,
  65: rainingVideo,
  66: rainingVideo,
  67: rainingVideo,
  71: snowingVideo,
  73: snowingVideo,
  75: snowingVideo,
  77: snowingVideo,
  80: rainingVideo,
  81: rainingVideo,
  82: rainingVideo,
  85: snowingVideo,
  86: snowingVideo,
  95: thunderstormVideo,
  96: thunderstormVideo,
  99: thunderstormVideo,
};
