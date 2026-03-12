import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RiCheckFill, RiMapPin2Line, RiSearchLine } from "@remixicon/react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "./ui/utils";
import { toast } from "./ui/sonner";
import { fetchWeatherCitySuggestions, type WeatherCitySuggestion, useWeatherLocation } from "@/hooks/useWeatherLocation";

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
}

export function WeatherCard({ onWeatherUpdate, variant = "inverted" }: WeatherCardProps) {
  const { t, i18n } = useTranslation();
  const {
    weatherData,
    isRefreshing,
    manualCityName,
    refresh,
    setManualLocation,
  } = useWeatherLocation({ onWeatherUpdate });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<WeatherCitySuggestion[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [isCitySearching, setIsCitySearching] = useState(false);

  useEffect(() => {
    if (!dialogOpen) return;
    setCityQuery(manualCityName || "");
    setSelectedCityId(null);
    setCitySuggestions([]);
  }, [dialogOpen, manualCityName]);

  useEffect(() => {
    if (!dialogOpen) return;
    const keyword = cityQuery.trim();
    if (keyword.length < 2) {
      setCitySuggestions([]);
      setSelectedCityId(null);
      setIsCitySearching(false);
      return;
    }

    let cancelled = false;
    setIsCitySearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const list = await fetchWeatherCitySuggestions(keyword, i18n.language, 10);
        if (cancelled) return;
        setCitySuggestions(list);
        setSelectedCityId((prev) => (prev && list.some((item) => item.id === prev) ? prev : null));
      } catch {
        if (!cancelled) {
          setCitySuggestions([]);
          setSelectedCityId(null);
        }
      } finally {
        if (!cancelled) {
          setIsCitySearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [cityQuery, dialogOpen, i18n.language]);

  const selectedCity = useMemo(
    () => citySuggestions.find((item) => item.id === selectedCityId) || null,
    [citySuggestions, selectedCityId],
  );

  const weatherText = t(`weather.codes.${weatherData.weatherCode}`, { defaultValue: t("weather.unknown") });
  const displayWeather = `${weatherText} ${Math.round(weatherData.temperature)}°C`;

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

    await refresh(true);
    toast.success(
      t("weather.manualCitySet", {
        defaultValue: "Manual city updated",
      }),
    );
    setDialogOpen(false);
  }, [refresh, selectedCity, setManualLocation, t]);

  return (
    <>
      <div
        className={`content-stretch flex gap-[6px] items-center justify-center p-[3px] relative rounded-[999px] shrink-0 cursor-pointer transition-colors transform-gpu backface-hidden ${
          variant === "inverted" ? "hover:bg-white/10 backdrop-blur-md" : "hover:bg-secondary"
        }`}
        data-name="Weather"
        onClick={onOpenDialog}
        title={t("weather.openLocationDialog", { defaultValue: "Click to open weather location settings" })}
      >
        <div
          aria-hidden="true"
          className={`absolute border border-solid inset-0 pointer-events-none rounded-[999px] ${
            variant === "inverted" ? "border-white/10" : "border-border"
          }`}
        />
        <WeatherCity city={weatherData.city} variant={variant} />
        <WeatherInfo weather={displayWeather} variant={variant} />
        {isRefreshing && (
          <span className="sr-only" aria-live="polite">
            {t("weather.refreshing")}
          </span>
        )}
      </div>

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

              <div className="relative">
                <RiSearchLine className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={cityQuery}
                  onChange={(event) => {
                    setCityQuery(event.target.value);
                    setSelectedCityId(null);
                  }}
                  placeholder={t("weather.manualCityPlaceholder", { defaultValue: "Search city, e.g. Shanghai" })}
                  className="h-11 rounded-xl border-border bg-secondary/30 pl-10"
                  disabled={isRefreshing}
                />
              </div>

              <ScrollArea
                className="max-h-[220px] rounded-2xl border border-border bg-secondary/20"
                scrollBarClassName="data-[orientation=vertical]:translate-x-2"
              >
                <div className="space-y-1 p-1 pr-3">
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

                  {!isCitySearching && citySuggestions.length > 0
                    ? citySuggestions.map((item) => {
                        const selected = item.id === selectedCityId;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedCityId(item.id);
                              setCityQuery(item.displayName);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors",
                              selected ? "bg-primary/20" : "hover:bg-secondary/60",
                            )}
                          >
                            <RiCheckFill className={cn("size-4", selected ? "opacity-100" : "opacity-0")} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm text-foreground">{item.displayName}</div>
                            </div>
                          </button>
                        );
                      })
                    : null}
                </div>
              </ScrollArea>

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
