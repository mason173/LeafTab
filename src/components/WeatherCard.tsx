import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from './ui/sonner';

function Location() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Location">
      <div className="absolute inset-[16.67%]" data-name="Group">
        <div className="absolute inset-[-4.69%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.6667 11.6667">
            <g id="Group">
              <path 
                clipRule="evenodd" 
                d="M5.83333 1.16666C3.90033 1.16666 2.33333 2.73366 2.33333 4.66666C2.33333 7.29166 5.83333 10.5 5.83333 10.5C5.83333 10.5 9.33333 7.29166 9.33333 4.66666C9.33333 2.73366 7.76633 1.16666 5.83333 1.16666ZM5.83333 6.125C5.02833 6.125 4.375 5.47166 4.375 4.66666C4.375 3.86166 5.02833 3.20833 5.83333 3.20833C6.63833 3.20833 7.29166 3.86166 7.29166 4.66666C7.29166 5.47166 6.63833 6.125 5.83333 6.125Z" 
                fillRule="evenodd" 
                id="Path" 
                stroke="currentColor" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}

function WeatherCity({ city, variant }: { city: string; variant: 'inverted' | 'default' }) {
  return (
    <div className={`${variant === 'inverted' ? 'bg-white/10 text-white/90' : 'bg-secondary text-foreground'} content-stretch flex gap-[2px] items-center justify-center p-[6px] relative rounded-[999px] shrink-0`}>
      <Location />
      <p className="font-['PingFang_SC:Regular',sans-serif] leading-none not-italic relative shrink-0 text-[13px]">{city}</p>
    </div>
  );
}

function WeatherInfo({ weather, variant }: { weather: string; variant: 'inverted' | 'default' }) {
  return (
    <div className="content-stretch flex items-center justify-center pr-[8px] relative shrink-0">
      <p className={`font-['PingFang_SC:Regular',sans-serif] leading-none not-italic relative shrink-0 text-[13px] ${variant === 'inverted' ? 'text-white/90' : 'text-foreground'}`}>{weather}</p>
    </div>
  );
}

interface WeatherCardProps { onWeatherUpdate?: (code: number) => void; variant?: 'inverted' | 'default'; }

export function WeatherCard({ onWeatherUpdate, variant = 'inverted' }: WeatherCardProps) {
  const { t, i18n } = useTranslation();
  const [weatherData, setWeatherData] = useState<{ city: string; weatherCode: number; temperature: number }>({ 
    city: t('weather.unknownLocation'), 
    weatherCode: 2, 
    temperature: 20 
  });

  const geolocateWithBrowser = () =>
    new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation unsupported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });

  const geolocateWithIP = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const resp = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error('ipapi failed');
      const data = await resp.json();
      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);
      const city = typeof data.city === 'string' ? data.city : undefined;
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        return { latitude, longitude, city };
      }
      throw new Error('Invalid ipapi data');
    } catch (e) {
      throw e;
    }
  };

  const fetchWeather = async (forceRefresh = false) => {
    const today = new Date().toDateString();
    const langKey = i18n.language.startsWith('zh') ? 'zh' : 'en';
    const cacheKeyDate = `weather_date_v2_${langKey}`;
    const cacheKeyData = `weather_data_v2_${langKey}`;
    
    const cachedDate = localStorage.getItem(cacheKeyDate);
    const cachedWeather = localStorage.getItem(cacheKeyData);

    let hasValidCache = false;
    if (!forceRefresh && cachedDate === today && cachedWeather) {
      const parsedWeather = JSON.parse(cachedWeather);
      setWeatherData(parsedWeather);
      onWeatherUpdate?.(parsedWeather.weatherCode);
      hasValidCache = true;
      return;
    }

    const getWeatherByCoords = async (latitude: number, longitude: number, cityName?: string, source: 'gps' | 'ip' = 'ip') => {
      try {
        let finalCity = cityName;
        if (!finalCity) {
          try {
            const langParam = i18n.language.startsWith('zh') ? 'zh' : 'en';
            const bdcResponse = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=${langParam}`
            );
            
            if (bdcResponse.ok) {
              const bdcData = await bdcResponse.json();
              finalCity = bdcData.city || bdcData.locality || bdcData.principalSubdivision;
            }

            if (!finalCity) {
              const nominatimLang = i18n.language.startsWith('zh') ? 'zh-CN' : 'en';
              const geoResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=${nominatimLang}`
              );
              if (geoResponse.ok) {
                const geoData = await geoResponse.json();
                const address = geoData.address;
                finalCity = address.city || address.town || address.county || address.village || address.state;
              }
            }

            if (finalCity) {
               if (i18n.language.startsWith('zh') && finalCity.length > 2 && (finalCity.endsWith('市') || finalCity.endsWith('区'))) {
                  finalCity = finalCity.slice(0, -1);
               }
            } else {
               finalCity = t('weather.local');
            }
          } catch (e) {
            console.warn('反向地理编码失败:', e);
            finalCity = t('weather.local');
          }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`,
            { signal: controller.signal }
          );
          clearTimeout(timeoutId);
          
          if (!weatherResponse.ok) throw new Error('Weather API failed');
          
          const weatherInfo = await weatherResponse.json();
          const { current_weather } = weatherInfo;
          
          if (current_weather) {
            const newWeatherData = {
              city: finalCity || 'Unknown',
              weatherCode: current_weather.weathercode,
              temperature: current_weather.temperature,
              source: source
            };
            
            setWeatherData(newWeatherData);
            onWeatherUpdate?.(newWeatherData.weatherCode);
            
            localStorage.setItem(cacheKeyDate, today);
            localStorage.setItem(cacheKeyData, JSON.stringify(newWeatherData));
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          throw fetchError;
        }
      } catch (error) {
        console.error('通过坐标获取天气失败:', error);
        if (!hasValidCache) {
           setWeatherData({ 
             city: t('weather.unknownLocation'), 
             weatherCode: 2, 
             temperature: 20 
           });
           onWeatherUpdate?.(2);
           toast.error(t('weather.refreshing') + " (Network Error)");
        }
      }
    };

    const saved = localStorage.getItem('user_coords_v1');
    if (!forceRefresh && saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
          await getWeatherByCoords(parsed.latitude, parsed.longitude, undefined, 'gps');
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved coords', e);
      }
    }

    try {
      const browserCoords = await geolocateWithBrowser();
      localStorage.setItem('user_coords_v1', JSON.stringify(browserCoords));
      await getWeatherByCoords(browserCoords.latitude, browserCoords.longitude, undefined, 'gps');
      return;
    } catch (geoError) {
      console.warn('浏览器定位失败或被拒绝:', geoError);
      try {
        const ipLoc = await geolocateWithIP();
        await getWeatherByCoords(ipLoc.latitude, ipLoc.longitude, ipLoc.city, 'ip');
        return;
      } catch (ipError) {
        console.error('IP定位失败:', ipError);
        if (!hasValidCache) {
          setWeatherData({ 
            city: t('weather.unknownLocation'), 
            weatherCode: 2, 
            temperature: 20 
          });
        }
      }
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [i18n.language]);

  const weatherText = t(`weather.codes.${weatherData.weatherCode}`, { defaultValue: t('weather.unknown') });
  const displayWeather = `${weatherText} ${Math.round(weatherData.temperature)}°C`;

  return (
    <div 
      className={`content-stretch flex gap-[6px] items-center justify-center p-[3px] relative rounded-[999px] shrink-0 cursor-pointer transition-colors transform-gpu backface-hidden ${variant === 'inverted' ? 'hover:bg-white/10 backdrop-blur-md' : 'hover:bg-secondary'}`} 
      data-name="Weather"
      onClick={() => {
        toast.info(t('weather.refreshing'));
        fetchWeather(true);
      }}
    >
      <div aria-hidden="true" className={`absolute border border-solid inset-0 pointer-events-none rounded-[999px] ${variant === 'inverted' ? 'border-white/10' : 'border-border'}`} />
      <WeatherCity city={weatherData.city} variant={variant} />
      <WeatherInfo weather={displayWeather} variant={variant} />
    </div>
  );
}
