"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Loader2,
  MapPin,
  Navigation,
  Plus,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { api, ApiError, type WeatherResponse } from "@/lib/client/api";
import { useApp } from "@/components/providers";
import SkyCanvas from "@/components/sky-canvas";
import HourlyStrip from "@/components/hourly-strip";
import OutfitCard from "@/components/outfit-card";
import MetricGrid from "@/components/metric-grid";
import CitySearch from "@/components/city-search";
import PopularCities from "@/components/popular-cities";
import { conditionIcon } from "@/components/weather-icons";
import { ErrorCard, HomeSkeleton } from "@/components/states";

const ACTIVE_LOC_KEY = "ww_active_loc";

export default function HomeScreen() {
  const { dict, locations, displayTemp, displayTempDelta, online, gps, locale, refreshLocations } =
    useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeLoc = useMemo(() => {
    if (!locations.length) return null;
    return (
      locations.find((l) => l.id === activeId) ??
      locations.find((l) => l.isPrimary) ??
      locations[0]
    );
  }, [locations, activeId]);

  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_LOC_KEY);
    if (saved) setActiveId(saved);
  }, []);

  const load = useCallback(
    async (lat: number, lon: number, manual = false) => {
      if (manual) setRefreshing(true);
      setError(null);
      try {
        const res = await api.weather(lat, lon);
        setData(res);
        setLoading(false);
      } catch (err) {
        setError(
          err instanceof ApiError && err.code === "weather_unavailable"
            ? dict.errors.weatherDown
            : dict.errors.network,
        );
        setLoading(false);
      } finally {
        setRefreshing(false);
      }
    },
    [dict],
  );

  useEffect(() => {
    if (activeLoc) {
      setLoading(true);
      void load(activeLoc.lat, activeLoc.lon);
    } else {
      setLoading(false);
    }
  }, [activeLoc, load]);

  const fc = data?.forecast ?? null;
  const hour = fc ? parseInt(fc.now.time.slice(11, 13), 10) : 12;
  const ConditionIcon = fc ? conditionIcon(fc.now.condition, fc.now.isDay) : null;

  // ---- No locations — inline city picker, no dead-end ------------------
  if (!activeLoc && !loading) {
    return (
      <div className="relative min-h-dvh overflow-hidden">
        <div className="absolute inset-0">
          <SkyCanvas kind="clear" isDay hour={11} />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950/90" />
        <div
          className="relative z-10 mx-auto max-w-md space-y-5 px-5 pb-32"
          style={{ paddingTop: "max(env(safe-area-inset-top), 24px)" }}
        >
          <div className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/12 backdrop-blur-xl">
              <MapPin size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">{dict.app.name}</h1>
            <p className="mt-2 text-[14px] leading-relaxed text-white/70">
              {dict.errors.cityRequired}
            </p>
          </div>

          {/* Quick-pick cities */}
          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-white/50">
              {dict.onboard.pickCity}
            </p>
            <PopularCities onDone={() => {}} />
          </div>

          {/* City search */}
          <CitySearch
            autoFocus
            onPick={async (p) => {
              await api
                .addLocation({
                  label: p.label,
                  country: p.country,
                  admin1: p.admin1,
                  lat: p.lat,
                  lon: p.lon,
                  kind: "manual",
                })
                .catch(() => undefined);
              await refreshLocations();
            }}
          />

          {/* GPS fallback */}
          {gps.supported && (
            <button
              onClick={() =>
                void gps
                  .requestAndSave()
                  .catch(() => undefined)
              }
              disabled={gps.busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-5 py-3 text-[14px] font-medium text-white/80 backdrop-blur-xl transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {gps.busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Navigation size={16} />
              )}
              {dict.onboard.useGps}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading && !data) return <HomeSkeleton />;

  return (
    <div className="relative min-h-dvh">
      {/* Living sky backdrop */}
      <div className="fixed inset-0 -z-10">
        {fc && (
          <SkyCanvas
            key={`${fc.now.kind}-${fc.now.isDay}`}
            kind={fc.now.kind}
            isDay={fc.now.isDay}
            hour={hour}
          />
        )}
      </div>
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-slate-950/10 via-slate-950/25 to-slate-950/70" />

      <main
        className="mx-auto max-w-md px-4 pb-32"
        style={{ paddingTop: "max(env(safe-area-inset-top), 20px)" }}
      >
        {/* Top bar */}
        <header className="flex items-center justify-between py-2">
          <div className="relative">
            <button
              onClick={() => setPickerOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-xl active:scale-95"
              aria-expanded={pickerOpen}
            >
              <MapPin size={14} className="text-amber-300" />
              <span className="max-w-[160px] truncate">{activeLoc?.label}</span>
              <ChevronDown
                size={14}
                className={`transition-transform ${pickerOpen ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {pickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  className="absolute top-11 start-0 z-30 w-60 overflow-hidden rounded-2xl border border-white/12 bg-slate-950/90 shadow-2xl backdrop-blur-2xl"
                >
                  {locations.map((l) => (
                    <button
                      key={l.id}
                      onClick={() => {
                        setActiveId(l.id);
                        localStorage.setItem(ACTIVE_LOC_KEY, l.id);
                        setPickerOpen(false);
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-3 text-start text-sm transition-colors hover:bg-white/8 ${
                        activeLoc?.id === l.id ? "text-amber-300" : "text-white/85"
                      }`}
                    >
                      <MapPin size={13} />
                      <span className="truncate">
                        {l.label}
                        {l.kind === "gps" && (
                          <span className="ms-1.5 text-[10px] text-sky-300">GPS</span>
                        )}
                      </span>
                    </button>
                  ))}
                  <Link
                    href="/cities"
                    onClick={() => setPickerOpen(false)}
                    className="flex w-full items-center gap-2 border-t border-white/8 px-4 py-3 text-sm text-sky-300"
                  >
                    <Plus size={13} />
                    {dict.cities.add}…
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() =>
              activeLoc && void load(activeLoc.lat, activeLoc.lon, true)
            }
            aria-label={dict.home.refresh}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white backdrop-blur-xl active:scale-90"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
          </button>
        </header>

        {error && !data && (
          <div className="mt-10">
            <ErrorCard
              message={error}
              onRetry={() =>
                activeLoc &&
                void load(activeLoc.lat, activeLoc.lon, true)
              }
            />
          </div>
        )}

        {fc && data && (
          <motion.div
            key={activeLoc?.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-6"
          >
            {/* Hero reading */}
            <div className="flex flex-col items-center pb-1 pt-5 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.1,
                  type: "spring",
                  stiffness: 200,
                  damping: 18,
                }}
              >
                {ConditionIcon && (
                  <ConditionIcon
                    size={52}
                    strokeWidth={1.4}
                    className="mb-2 text-white drop-shadow-lg"
                  />
                )}
              </motion.div>
              <div className="font-display text-[88px] font-bold leading-none tracking-tighter text-white drop-shadow-xl tabular-nums">
                {displayTemp(fc.now.t)}
              </div>
              <p className="mt-1 text-lg font-medium text-white/90">
                {dict.conditions[fc.now.condition]}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[13px] text-white/70">
                <span>
                  {dict.home.high} {displayTemp(fc.today.max)}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span>
                  {dict.home.low} {displayTemp(fc.today.min)}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/40" />
                <span>
                  {displayTempDelta(fc.today.max - fc.today.min)}{" "}
                  {dict.home.swing}
                </span>
              </div>
              <p className="mt-1.5 text-[12px] text-white/50">
                {dict.home.feelsLike} {displayTemp(fc.now.feels)} ·{" "}
                {dict.home.updated}{" "}
                {new Date(fc.fetchedAt).toLocaleTimeString(
                  locale === "ar"
                    ? "ar-TN"
                    : locale === "fr"
                      ? "fr-FR"
                      : "en-GB",
                  { hour: "2-digit", minute: "2-digit" },
                )}
              </p>
            </div>

            {!online && (
              <div className="flex items-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-2.5 text-[13px] text-amber-200 backdrop-blur-xl">
                <WifiOff size={15} />
                {dict.common.offline}
              </div>
            )}

            <HourlyStrip hours={fc.hours} />
            <OutfitCard outfit={data.outfit} />
            <MetricGrid forecast={fc} />
          </motion.div>
        )}
      </main>
    </div>
  );
}
