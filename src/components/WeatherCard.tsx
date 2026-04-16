import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiCheckFill, RiMapPin2Line } from "@/icons/ri-compat";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { cn } from "./ui/utils";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { toast } from "./ui/sonner";
import { useCitySearch } from "@/hooks/useCitySearch";
import { fetchWeatherCitySuggestions, useWeatherLocation } from "@/hooks/useWeatherLocation";
import { isFirefoxBuildTarget } from "@/platform/browserTarget";

function WeatherCity({ city, variant }: { city: string; variant: "inverted" | "default" }) {
  return (
    <div
      className={`${
        variant === "inverted" ? "bg-white/10 text-white/90" : "bg-secondary text-foreground"
      } content-stretch flex gap-[2px] items-center justify-center p-[6px] relative rounded-[999px] shrink-0`}
    >
      <RiMapPin2Line className="size-4 shrink-0" />
      <p className="font-['PingFang_SC:Regular',sans-serif] leading-none not-italic relative shrink-0 text-[13px]">
        {city}
      </p>
    </div>
  );
}

function WeatherInfo({ weather, variant }: { weather: string; variant: "inverted" | "default" }) {
  return (
    <div className="content-stretch flex items-center justify-center pr-[8px] relative shrink-0">
      <p
        className={`font-['PingFang_SC:Regular',sans-serif] leading-none not-italic relative shrink-0 text-[13px] ${
          variant === "inverted" ? "text-white/90" : "text-foreground"
        }`}
      >
        {weather}
      </p>
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
  const { t, i18n } = useTranslation();
  const {
    weatherData,
    isRefreshing,
    manualCityName,
    refresh,
    setManualLocation,
  } = useWeatherLocation({ onWeatherUpdate });

  const [dialogOpen, setDialogOpen] = useState(false);
  const {
    query: cityQuery,
    suggestions: citySuggestions,
    selectedCity,
    selectedCityId,
    isSearching: isCitySearching,
    setQuery: setCityQuery,
    selectSuggestion,
  } = useCitySearch({
    open: dialogOpen,
    initialQuery: manualCityName || "",
    language: i18n.language,
    fetchSuggestions: fetchWeatherCitySuggestions,
    minQueryLength: 2,
    maxSuggestions: 10,
    debounceMs: 250,
  });

  const weatherText = t(`weather.codes.${weatherData.weatherCode}`, { defaultValue: t("weather.unknown") });
  const displayCity = weatherData.city?.trim() || t("weather.unknownLocation");
  const displayWeather = `${weatherText} ${Math.round(weatherData.temperature)}°C`;
  const displayLine = `${displayCity} ${displayWeather}`;

  const onOpenDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const onSetManualCity = useCallback(async () => {
    if (!selectedCity) {
      toast.error(
        t("weather.manualCityNeedSelect", {
          defaultValue: "Please select a city from the dropdown list",
        }),
      );
      return;
    }

    const ok = setManualLocation({
      city: selectedCity.city,
      latitude: selectedCity.latitude,
      longitude: selectedCity.longitude,
    });

    if (!ok) {
      toast.error(
        t("weather.manualCityInvalid", {
          defaultValue: "City lookup failed, please check the spelling",
        }),
      );
      return;
    }

    setDialogOpen(false);
    toast.success(
      t("weather.manualCitySet", {
        defaultValue: "Manual city updated",
      }),
    );
    void refresh(true);
  }, [refresh, selectedCity, setManualLocation, t]);

  return (
    <>
      <button
        type="button"
        className={cn(
          "appearance-none border-0 bg-transparent p-0 font-inherit outline-none",
          displayMode === "inline"
            ? `max-w-full shrink-0 cursor-pointer transition-colors pointer-events-auto ${
                variant === "inverted"
                  ? "text-white/90 hover:text-white"
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
        aria-label={displayLine}
      >
        {displayMode === "inline" ? (
          <span className={cn("block max-w-full truncate text-center leading-snug", textClassName)}>
            {displayLine}
          </span>
        ) : (
          <>
            <div
              aria-hidden="true"
              className={`absolute border border-solid inset-0 pointer-events-none rounded-[999px] ${
                variant === "inverted" ? "border-white/10" : "border-border"
              }`}
            />
            <WeatherCity city={displayCity} variant={variant} />
            <WeatherInfo weather={displayWeather} variant={variant} />
          </>
        )}
        {isRefreshing && (
          <span className="sr-only" aria-live="polite">
            {t("weather.refreshing")}
          </span>
        )}
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[520px] bg-background border-border text-foreground rounded-[32px] backdrop-blur-none">
          <DialogHeader>
            <DialogTitle>
              {t("weather.locationSettingsTitle", {
                defaultValue: "Weather Location",
              })}
            </DialogTitle>
            <DialogDescription>
              {t("weather.locationSettingsDesc", {
                defaultValue: "Set a manual city and save",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-2xl border border-border bg-secondary/40 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-medium text-foreground">{weatherData.city}</div>
                <RiMapPin2Line className="size-4 shrink-0 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {t("weather.manualCityLabel", { defaultValue: "Manual city (highest priority)" })}
              </p>

              <div className="rounded-2xl border border-border bg-secondary/20 overflow-hidden">
                <Command shouldFilter={false} className="bg-transparent">
                  <div className="px-2 pt-2">
                    <div className="rounded-xl border border-border bg-secondary/30">
                      <CommandInput
                        value={cityQuery}
                        onValueChange={setCityQuery}
                        placeholder={t("weather.manualCityPlaceholder", { defaultValue: "Search city, e.g. Shanghai" })}
                        disabled={isRefreshing}
                        className="h-11"
                      />
                    </div>
                  </div>
                  <CommandList className="max-h-[220px] px-2 pb-2">
                    {isCitySearching ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {t("weather.manualCitySearching", { defaultValue: "Searching cities..." })}
                      </div>
                    ) : null}

                    {!isCitySearching && cityQuery.trim().length < 2 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {t("weather.manualCitySearchHint", { defaultValue: "Type at least 2 characters to search" })}
                      </div>
                    ) : null}

                    {!isCitySearching && cityQuery.trim().length >= 2 && citySuggestions.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        {t("weather.manualCityNoResult", { defaultValue: "No matching city found" })}
                      </div>
                    ) : null}

                    {!isCitySearching && citySuggestions.length > 0 ? (
                      <CommandGroup className="p-0">
                        {citySuggestions.map((item) => {
                          const selected = item.id === selectedCityId;
                          return (
                            <CommandItem
                              key={item.id}
                              value={item.id}
                              onSelect={() => {
                                selectSuggestion(item);
                              }}
                              className={cn(
                                "mx-1 my-0.5 rounded-xl px-3 py-2 data-[selected=true]:bg-secondary/60 data-[selected=true]:text-foreground",
                                selected ? "bg-primary/20" : "",
                              )}
                            >
                              <RiCheckFill className={cn("size-4", selected ? "opacity-100" : "opacity-0")} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm text-foreground">{item.displayName}</div>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    ) : null}
                  </CommandList>
                </Command>
              </div>

              <div className="text-xs text-muted-foreground">
                {t("weather.manualCityNeedSelect", {
                  defaultValue: "Please select a city from the dropdown list",
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex w-full gap-3 sm:gap-3">
            <Button
              variant="secondary"
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80"
              onClick={() => setDialogOpen(false)}
              disabled={isRefreshing}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              className="flex-1"
              onClick={onSetManualCity}
              disabled={isRefreshing || !selectedCity}
            >
              {t("common.save", { defaultValue: "Save" })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
