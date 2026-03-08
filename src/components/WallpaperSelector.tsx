import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RiCheckFill, RiDownload2Fill, RiImageFill, RiUpload2Fill } from "@remixicon/react";
import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { saveWallpaper } from "../db";
import imgImage from "../assets/Default_wallpaper.png";

// Weather Wallpaper Assets
import cloudyVideo from "../assets/weather/Cloudy.mp4";
import foggyVideo from "../assets/weather/Foggy day.mp4";
import sunnyVideo from "../assets/weather/Sunny day.mp4";
import thunderstormVideo from "../assets/weather/Thunderstorm.mp4";
import rainingVideo from "../assets/weather/raining.mp4";
import snowingVideo from "../assets/weather/snowing.mp4";

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

export { sunnyVideo };

interface WallpaperSelectorProps {
  mode: 'bing' | 'weather' | 'custom';
  onModeChange: (mode: 'bing' | 'weather' | 'custom') => void;
  bingWallpaper: string;
  weatherCode: number;
  customWallpaper: string | null;
  onCustomWallpaperChange: (url: string) => void;
  hideWeather?: boolean;
  trigger?: React.ReactNode;
}

export default function WallpaperSelector({ 
  mode, 
  onModeChange,
  bingWallpaper,
  weatherCode,
  customWallpaper,
  onCustomWallpaperChange,
  hideWeather = false,
  trigger
}: WallpaperSelectorProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed, falling back to direct link:', error);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleBingDownload = async () => {
    try {
      const market = i18n.language.startsWith('zh') ? 'zh-CN' : 'en-US';
      const response = await fetch(`https://bing.biturl.top/?resolution=UHD&format=json&index=0&mkt=${market}`);
      const data = await response.json();
      
      if (data.url) {
        handleDownload(data.url, 'bing-wallpaper-4k.jpg');
      } else {
        handleDownload(bingWallpaper || imgImage, 'bing-wallpaper.jpg');
      }
    } catch (error) {
      console.error('Failed to fetch 4K wallpaper:', error);
      handleDownload(bingWallpaper || imgImage, 'bing-wallpaper.jpg');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const url = event.target?.result as string;
        try {
          await saveWallpaper(url);
          onCustomWallpaperChange(url);
          onModeChange('custom');
        } catch (error) {
          console.error('Failed to save wallpaper:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <div 
            className="bg-white/10 content-stretch flex items-center justify-center p-[6px] relative rounded-[999px] shrink-0 cursor-pointer hover:bg-white/20 transition-colors text-white/90 backdrop-blur-md transform-gpu" 
            data-name="Wallpaper"
          >
            <div aria-hidden="true" className="absolute border border-white/10 border-solid inset-0 pointer-events-none rounded-[999px]" />
            <RiImageFill className="size-5" />
          </div>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[480px] bg-popover/95 backdrop-blur-xl border-white/10 rounded-[24px] overflow-hidden p-0 shadow-2xl [&>button]:text-foreground [&>button]:opacity-70 [&>button:hover]:opacity-100">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">{t('weather.wallpaper.mode')}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue={mode} className="w-full flex-1 flex flex-col">
            <div className="px-6 pb-4">
              <TabsList className={`grid w-full ${hideWeather ? 'grid-cols-2' : 'grid-cols-3'} bg-muted/50 p-1 rounded-xl h-auto`}>
                <TabsTrigger value="bing" className="rounded-lg py-2 text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                  {t('weather.wallpaper.bing')}
                </TabsTrigger>
                {!hideWeather && (
                  <TabsTrigger value="weather" className="rounded-lg py-2 text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                    {t('weather.wallpaper.weather')}
                  </TabsTrigger>
                )}
                <TabsTrigger value="custom" className="rounded-lg py-2 text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
                  {t('weather.wallpaper.custom')}
                </TabsTrigger>
              </TabsList>
            </div>
            
            <Separator className="bg-border/40" />

            <div className="p-4">
              <TabsContent value="bing" className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col gap-4">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 shadow-sm group bg-muted/20">
                    <img src={bingWallpaper || imgImage} alt="Bing" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-2">
                      <Button 
                        size="icon" 
                        variant="secondary" 
                        className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white border-none"
                        onClick={handleBingDownload}
                        title={t('weather.wallpaper.download')}
                      >
                        <RiDownload2Fill className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium leading-none">{t('weather.wallpaper.bing')}</h4>
                      <p className="text-xs text-muted-foreground">
                        {t('weather.wallpaper.bingDesc')}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      {mode === 'bing' ? (
                        <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                          <RiCheckFill className="size-3.5" />
                          {t('common.current')}
                        </Button>
                      ) : (
                        <Button onClick={() => onModeChange('bing')} className="h-9 gap-2 min-w-[160px] text-sm">
                          {t('weather.wallpaper.apply')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {!hideWeather && (
                <TabsContent value="weather" className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col gap-4">
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-border/50 shadow-sm bg-transparent group">
                      <div className="grid grid-cols-3 h-full gap-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
                        <video src={sunnyVideo} className="h-full object-cover" muted loop autoPlay />
                        <video src={rainingVideo} className="h-full object-cover" muted loop autoPlay />
                        <video src={cloudyVideo} className="h-full object-cover" muted loop autoPlay />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium leading-none">{t('weather.wallpaper.weather')}</h4>
                        <p className="text-xs text-muted-foreground">
                          {t('weather.wallpaper.weatherDesc')}
                        </p>
                      </div>
                      <div className="flex justify-center">
                        {mode === 'weather' ? (
                          <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                            <RiCheckFill className="size-3.5" />
                            {t('common.current')}
                          </Button>
                        ) : (
                          <Button onClick={() => onModeChange('weather')} className="h-9 gap-2 min-w-[160px] text-sm">
                            {t('weather.wallpaper.apply')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="custom" className="mt-0 outline-none animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col gap-4">
                  <div 
                    onClick={() => !customWallpaper && fileInputRef.current?.click()}
                    className={`relative aspect-video rounded-xl overflow-hidden border transition-all group ${
                      !customWallpaper 
                        ? 'border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 cursor-pointer flex flex-col items-center justify-center gap-3' 
                        : 'border-border/50 shadow-sm'
                    }`}
                  >
                    {customWallpaper ? (
                      <>
                        <img src={customWallpaper} alt="Custom" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <Button 
                            variant="secondary" 
                            className="h-9 gap-2 bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border-none text-sm"
                            onClick={handleUploadClick}
                          >
                            <RiUpload2Fill className="size-3.5" />
                            {t('weather.wallpaper.upload')}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
                        <div className="p-3 rounded-full bg-muted group-hover:bg-primary/10 transition-colors">
                          <RiUpload2Fill className="size-6" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{t('weather.wallpaper.uploadTitle')}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{t('weather.wallpaper.imageSupport')}</p>
                        </div>
                      </div>
                    )}
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium leading-none">{t('weather.wallpaper.custom')}</h4>
                      <p className="text-xs text-muted-foreground">
                        {customWallpaper ? t('weather.wallpaper.customUploaded') : t('weather.wallpaper.customDesc')}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      {mode === 'custom' ? (
                        <Button disabled variant="secondary" className="h-9 gap-2 min-w-[160px] bg-primary/10 text-primary hover:bg-primary/20 text-sm">
                          <RiCheckFill className="size-3.5" />
                          {t('common.current')}
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            if (customWallpaper) onModeChange('custom');
                            else fileInputRef.current?.click();
                          }} 
                          disabled={!customWallpaper}
                          className="h-9 gap-2 min-w-[160px] text-sm"
                        >
                          {t('weather.wallpaper.apply')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
