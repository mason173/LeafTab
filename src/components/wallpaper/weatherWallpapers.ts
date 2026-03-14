import cloudyVideo from '@/assets/weather/Cloudy.mp4';
import foggyVideo from '@/assets/weather/Foggy day.mp4';
import sunnyVideo from '@/assets/weather/Sunny day.mp4';
import thunderstormVideo from '@/assets/weather/Thunderstorm.mp4';
import rainingVideo from '@/assets/weather/raining.mp4';
import snowingVideo from '@/assets/weather/snowing.mp4';

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
