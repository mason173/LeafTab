import { lazy, Suspense, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import sunnyIcon from "@/assets/weather-icons/sunny.svg?raw";
import partlyCloudyIcon from "@/assets/weather-icons/partly-cloudy.svg?raw";
import overcastIcon from "@/assets/weather-icons/overcast.svg?raw";
import foggyIcon from "@/assets/weather-icons/foggy.svg?raw";
import lightRainIcon from "@/assets/weather-icons/light-rain.svg?raw";
import heavyRainIcon from "@/assets/weather-icons/heavy-rain.svg?raw";
import sleetIcon from "@/assets/weather-icons/sleet.svg?raw";
import lightSnowIcon from "@/assets/weather-icons/light-snow.svg?raw";
import heavySnowIcon from "@/assets/weather-icons/heavy-snow.svg?raw";
import thunderstormIcon from "@/assets/weather-icons/thunderstorm.svg?raw";
import { cn } from "./ui/utils";
import { useWeatherLocation } from "@/hooks/useWeatherLocation";
import { isFirefoxBuildTarget } from "@/platform/browserTarget";

const LazyWeatherLocationDialog = lazy(() => import("@/components/WeatherLocationDialog").then((module) => ({
  default: module.WeatherLocationDialog,
})));

let weatherLocationDialogPreloadPromise: Promise<unknown> | null = null;

const preloadWeatherLocationDialog = () => {
  if (!weatherLocationDialogPreloadPromise) {
    weatherLocationDialogPreloadPromise = import("@/components/WeatherLocationDialog");
  }
  return weatherLocationDialogPreloadPromise;
};

type WeatherIconKey =
  | "sunny"
  | "partly-cloudy"
  | "overcast"
  | "foggy"
  | "light-rain"
  | "heavy-rain"
  | "sleet"
  | "light-snow"
  | "heavy-snow"
  | "thunderstorm";

const WEATHER_ICON_MARKUP: Record<WeatherIconKey, string> = {
  sunny: sunnyIcon,
  "partly-cloudy": partlyCloudyIcon,
  overcast: overcastIcon,
  foggy: foggyIcon,
  "light-rain": lightRainIcon,
  "heavy-rain": heavyRainIcon,
  sleet: sleetIcon,
  "light-snow": lightSnowIcon,
  "heavy-snow": heavySnowIcon,
  thunderstorm: thunderstormIcon,
};

function resolveWeatherIconKey(weatherCode: number): WeatherIconKey {
  if ([0, 1].includes(weatherCode)) return "sunny";
  if (weatherCode === 2) return "partly-cloudy";
  if (weatherCode === 3) return "overcast";
  if ([45, 48].includes(weatherCode)) return "foggy";
  if ([55, 65, 82].includes(weatherCode)) return "heavy-rain";
  if ([56, 57, 66, 67].includes(weatherCode)) return "sleet";
  if ([71, 85].includes(weatherCode)) return "light-snow";
  if ([73, 75, 77, 86].includes(weatherCode)) return "heavy-snow";
  if ([95, 96, 99].includes(weatherCode)) return "thunderstorm";
  return "light-rain";
}

function normalizeWeatherSvgMarkup(markup: string) {
  return markup
    .replace(/fill="white"/gi, 'fill="currentColor"')
    .replace(/stroke="white"/gi, 'stroke="currentColor"')
    .replace(/fill:#fff\b/gi, 'fill:currentColor')
    .replace(/fill:#ffffff\b/gi, 'fill:currentColor')
    .replace(/stroke:#fff\b/gi, 'stroke:currentColor')
    .replace(/stroke:#ffffff\b/gi, 'stroke:currentColor');
}

const NORMALIZED_WEATHER_ICON_MARKUP: Record<WeatherIconKey, string> = Object.fromEntries(
  Object.entries(WEATHER_ICON_MARKUP).map(([key, markup]) => [key, normalizeWeatherSvgMarkup(markup)]),
) as Record<WeatherIconKey, string>;

function WeatherGlyph({
  weatherCode,
  className,
}: {
  weatherCode: number;
  className?: string;
}) {
  const markup = NORMALIZED_WEATHER_ICON_MARKUP[resolveWeatherIconKey(weatherCode)];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center leading-none align-middle [&>svg]:block [&>svg]:h-full [&>svg]:w-full [&>svg]:overflow-visible [&>svg]:origin-center [&>svg]:scale-[1.28]",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

function WeatherStatusInline({
  weatherCode,
  temperatureText,
  className,
}: {
  weatherCode: number;
  temperatureText: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 leading-none align-middle", className)}>
      <WeatherGlyph weatherCode={weatherCode} className="size-[1.15em] self-center" />
      <span className="inline-flex items-center shrink-0 leading-none">{temperatureText}</span>
    </span>
  );
}

function WeatherInfo({
  weatherCode,
  temperatureText,
  variant,
}: {
  weatherCode: number;
  temperatureText: string;
  variant: "inverted" | "default";
}) {
  return (
    <div className="content-stretch flex items-center justify-center gap-[6px] pr-[8px] relative shrink-0 leading-none">
      <WeatherGlyph
        weatherCode={weatherCode}
        className={`size-[18px] self-center ${
          variant === "inverted" ? "hero-tint-text" : "text-foreground"
        }`}
      />
      <span
        className={`font-['PingFang_SC:Regular',sans-serif] inline-flex items-center leading-none not-italic relative shrink-0 text-[13px] ${
          variant === "inverted" ? "hero-tint-text" : "text-foreground"
        }`}
      >
        {temperatureText}
      </span>
    </div>
  );
}

interface WeatherCardProps {
  onWeatherUpdate?: (code: number) => void;
  variant?: "inverted" | "default";
  disableBackdropBlur?: boolean;
  displayMode?: "pill" | "inline";
  className?: string;
  textClassName?: string;
}

export function WeatherCard({
  onWeatherUpdate,
  variant = "inverted",
  disableBackdropBlur = false,
  displayMode = "pill",
  className,
  textClassName,
}: WeatherCardProps) {
  const firefox = isFirefoxBuildTarget();
  const { t } = useTranslation();
  const {
    weatherData,
    isRefreshing,
    manualCityName,
    refresh,
    setManualLocation,
  } = useWeatherLocation({ onWeatherUpdate });

  const [dialogOpen, setDialogOpen] = useState(false);

  const weatherText = t(`weather.codes.${weatherData.weatherCode}`, { defaultValue: t("weather.unknown") });
  const displayCity = weatherData.city?.trim() || t("weather.unknownLocation");
  const temperatureText = `${Math.round(weatherData.temperature)}°C`;
  const hasManualLocation = Boolean(manualCityName?.trim());
  const locationPromptText = t("weather.setLocation", { defaultValue: "设置位置" });
  const dialogTriggerLabel = hasManualLocation
    ? `${weatherText} ${temperatureText}`
    : locationPromptText;

  const onOpenDialog = useCallback(() => {
    setDialogOpen(true);
    void preloadWeatherLocationDialog();
  }, []);

  return (
    <>
      <button
        type="button"
        className={cn(
          "appearance-none border-0 bg-transparent p-0 font-inherit outline-none",
          displayMode === "inline"
            ? `inline-flex w-fit max-w-full items-center justify-center cursor-pointer transition-colors pointer-events-auto ${
                variant === "inverted"
                  ? "hero-tint-text hero-tint-text-hover"
                  : "text-muted-foreground hover:text-foreground"
              }`
            : `content-stretch flex gap-[6px] items-center justify-center p-[3px] relative rounded-[999px] shrink-0 cursor-pointer transition-colors ${firefox ? "" : "transform-gpu backface-hidden"} ${
                variant === "inverted"
                  ? disableBackdropBlur
                    ? "hover:bg-white/10"
                    : firefox
                      ? "bg-white/12 hover:bg-white/16"
                      : "hover:bg-white/10 backdrop-blur-md"
                  : "hover:bg-secondary"
              }`,
          className,
        )}
        data-name="Weather"
        onClick={onOpenDialog}
        title={t("weather.openLocationDialog", { defaultValue: "Click to open weather location settings" })}
        aria-label={hasManualLocation ? `${displayCity} ${weatherText} ${temperatureText}` : locationPromptText}
      >
        {displayMode === "inline" ? (
          <span className={cn("inline-flex w-fit max-w-full items-center justify-center gap-2 leading-none text-center", textClassName)}>
            {hasManualLocation ? (
              <WeatherStatusInline
                weatherCode={weatherData.weatherCode}
                temperatureText={temperatureText}
              />
            ) : (
              <span className="truncate">{locationPromptText}</span>
            )}
          </span>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={`absolute border border-solid inset-0 pointer-events-none rounded-[999px] ${
                variant === "inverted" ? "border-white/10" : "border-border"
              }`}
            />
            <div className="content-stretch flex items-center justify-center px-[10px] py-[6px] relative shrink-0">
              {hasManualLocation ? (
                <WeatherInfo
                  weatherCode={weatherData.weatherCode}
                  temperatureText={temperatureText}
                  variant={variant}
                />
              ) : (
                <span
                  className={`font-['PingFang_SC:Regular',sans-serif] inline-flex items-center leading-none not-italic relative shrink-0 text-[13px] ${
                    variant === "inverted" ? "hero-tint-text" : "text-foreground"
                  }`}
                >
                  {dialogTriggerLabel}
                </span>
              )}
            </div>
          </>
        )}
        {isRefreshing && (
          <span className="sr-only" aria-live="polite">
            {t("weather.refreshing")}
          </span>
        )}
      </button>

      {dialogOpen ? (
        <Suspense fallback={null}>
          <LazyWeatherLocationDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            manualCityName={manualCityName}
            isRefreshing={isRefreshing}
            setManualLocation={setManualLocation}
            refresh={refresh}
          />
        </Suspense>
      ) : null}
    </>
  );
}
