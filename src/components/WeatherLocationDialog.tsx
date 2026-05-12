import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RiCheckFill } from "@/icons/ri-compat";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/components/ui/utils";
import { useCitySearch } from "@/hooks/useCitySearch";
import {
  fetchWeatherCitySuggestions,
  preloadWeatherCitySuggestions,
} from "@/hooks/useWeatherLocation";

interface WeatherLocationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manualCityName?: string | null;
  isRefreshing: boolean;
  setManualLocation: (payload: { city: string; latitude?: number; longitude?: number }) => boolean;
  refresh: (force?: boolean) => Promise<void>;
}

export function WeatherLocationDialog({
  open,
  onOpenChange,
  manualCityName,
  isRefreshing,
  setManualLocation,
  refresh,
}: WeatherLocationDialogProps) {
  const { t, i18n } = useTranslation();
  const {
    query: cityQuery,
    suggestions: citySuggestions,
    selectedCity,
    selectedCityId,
    isSearching: isCitySearching,
    setQuery: setCityQuery,
    selectSuggestion,
  } = useCitySearch({
    open,
    initialQuery: manualCityName || "",
    language: i18n.language,
    fetchSuggestions: fetchWeatherCitySuggestions,
    minQueryLength: 2,
    maxSuggestions: 10,
    debounceMs: 250,
  });

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

    onOpenChange(false);
    toast.success(
      t("weather.manualCitySet", {
        defaultValue: "Manual city updated",
      }),
    );
    void refresh(true);
  }, [onOpenChange, refresh, selectedCity, setManualLocation, t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            onClick={() => onOpenChange(false)}
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
  );
}

export { preloadWeatherCitySuggestions };
