"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Navigation, Search } from "lucide-react";
import { api, ApiError } from "@/lib/client/api";
import { LOCALES, LOCALE_META } from "@/i18n";
import { useApp } from "./providers";
import CitySearch from "./city-search";
import PopularCities from "./popular-cities";
import SkyCanvas from "./sky-canvas";

/**
 * First-launch flow. Three paths to get started:
 *  1) Tap a popular city (one-tap, no typing, no GPS)
 *  2) Search for any city by name
 *  3) Use GPS location (may be blocked in some environments)
 * All paths end with onDone(). Skippable without penalty.
 */
export default function Onboarding({ onDone }: { onDone: () => void }) {
  const { dict, locale, setLocale, gps, refreshLocations } = useApp();
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [busyCity, setBusyCity] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleGps = async () => {
    setGpsError(null);
    try {
      await gps.requestAndSave();
      onDone();
    } catch (err) {
      setGpsError(
        err instanceof ApiError && err.code in dict.errors
          ? dict.errors[err.code as keyof typeof dict.errors]
          : dict.errors.locationTimeout,
      );
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="absolute inset-0">
        <SkyCanvas kind="cloud" isDay hour={10} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950/90" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pb-8 pt-14">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/15 text-xl font-black text-white shadow-xl backdrop-blur-xl">
            W
          </div>
          <h1 className="text-[26px] font-bold leading-tight text-white">
            {dict.onboard.welcome}
          </h1>
          <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">
            {dict.onboard.subtitle}
          </p>
        </motion.div>

        {/* Language quick pick */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.5 }}
          className="flex gap-2"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => void setLocale(l)}
              className={`flex-1 rounded-2xl border px-2 py-2 text-sm font-medium backdrop-blur-xl transition-all ${
                locale === l
                  ? "border-amber-300/60 bg-white/20 text-white"
                  : "border-white/10 bg-white/6 text-white/60"
              }`}
            >
              <span className="mb-0.5 block text-[9px] font-bold tracking-widest text-white/50">
                {LOCALE_META[l].flag}
              </span>
              {LOCALE_META[l].label}
            </button>
          ))}
        </motion.div>

        {/* Main content: choose a city */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex-1 space-y-4 overflow-y-auto"
        >
          {/* Popular cities — one tap and you're in */}
          <div>
            <p className="mb-2 text-[13px] font-semibold text-white/60">
              {dict.onboard.pickCity}
            </p>
            <PopularCities onDone={onDone} />
          </div>

          {/* Expandable search */}
          <div>
            {!showSearch ? (
              <button
                onClick={() => setShowSearch(true)}
                className="flex w-full items-center gap-2.5 rounded-2xl border border-white/12 bg-white/8 px-4 py-3.5 text-[14px] text-white/50 backdrop-blur-xl transition-colors hover:bg-white/12"
              >
                <Search size={16} />
                {dict.cities.search}
              </button>
            ) : (
              <CitySearch
                autoFocus
                onPick={async (p) => {
                  setBusyCity(true);
                  await api
                    .addLocation({
                      label: p.label,
                      country: p.country,
                      admin1: p.admin1,
                      lat: p.lat,
                      lon: p.lon,
                      kind: "manual",
                    })
                    .catch((err) => {
                      console.error(err);
                      alert("Network error: Could not save city. Please check if cookies are enabled.");
                    });
                  await refreshLocations();
                  setBusyCity(false);
                  onDone();
                }}
              />
            )}
            {busyCity && (
              <div className="mt-2 flex items-center gap-2 text-[12px] text-white/50">
                <Loader2 size={12} className="animate-spin" />
                {dict.cities.add}…
              </div>
            )}
          </div>

          {/* GPS — secondary option */}
          <div className="rounded-2xl border border-white/8 bg-white/5 p-3.5 backdrop-blur-xl">
            <button
              onClick={handleGps}
              disabled={gps.busy || !gps.supported}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/12 px-4 py-3 text-[14px] font-medium text-white transition-all active:scale-[0.97] disabled:opacity-50"
            >
              {gps.busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Navigation size={16} />
              )}
              {dict.onboard.useGps}
            </button>
            {gpsError && (
              <p className="mt-2 text-[12px] text-rose-300/90">{gpsError}</p>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-white/40">
              {dict.onboard.gpsHint}
            </p>
          </div>
        </motion.div>

        {/* Skip */}
        <button
          onClick={onDone}
          className="mx-auto flex items-center gap-1 pb-1 text-sm font-medium text-white/50 transition-colors hover:text-white"
        >
          {dict.onboard.skip}
          <ArrowRight size={15} className="rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
