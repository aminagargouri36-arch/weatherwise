"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, Navigation, Star, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useApp } from "@/components/providers";
import CitySearch from "@/components/city-search";
import PopularCities from "@/components/popular-cities";

/** Cities manager: search & add, GPS tracking, home-city choice, removal. */
export default function CitiesScreen() {
  const { dict, locations, refreshLocations, gps } = useApp();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const remove = async (id: string) => {
    setBusyId(id);
    await api.removeLocation(id).catch(() => undefined);
    await refreshLocations();
    setBusyId(null);
  };

  const makePrimary = async (id: string) => {
    setBusyId(id);
    await api.setPrimary(id).catch(() => undefined);
    await refreshLocations();
    setBusyId(null);
  };

  const trackGps = async () => {
    setGpsError(null);
    setBusyId("gps");
    try {
      await gps.requestAndSave();
    } catch {
      setGpsError(dict.errors.locationDenied);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      className="mx-auto min-h-dvh max-w-md px-4 pb-32"
      style={{ paddingTop: "max(env(safe-area-inset-top), 20px)" }}
    >
      <header className="py-3">
        <h1 className="text-2xl font-bold text-white">{dict.cities.title}</h1>
      </header>

      <div className="space-y-5">
        {/* City search — always visible and prominent */}
        <div>
          <CitySearch
            autoFocus={locations.length === 0}
            onPick={async (p) => {
              setAdding(true);
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
              setAdding(false);
            }}
          />
          {adding && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] text-white/50">
              <Loader2 size={12} className="animate-spin" />
              {dict.cities.add}…
            </p>
          )}
        </div>

        {/* GPS button */}
        <button
          onClick={trackGps}
          disabled={!gps.supported || busyId === "gps"}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-sky-300/35 bg-sky-400/8 px-4 py-3.5 text-start transition-colors hover:bg-sky-400/14 active:scale-[0.99] disabled:opacity-50"
        >
          {busyId === "gps" ? (
            <Loader2 size={17} className="animate-spin text-sky-300" />
          ) : (
            <Navigation size={17} className="text-sky-300" />
          )}
          <span className="text-[14px] font-medium text-sky-100">
            {locations.some((l) => l.kind === "gps")
              ? dict.onboard.useGps
              : dict.cities.current}
          </span>
        </button>
        {gpsError && (
          <p className="-mt-3 px-1 text-[12px] text-rose-300">{gpsError}</p>
        )}

        {/* Saved locations list */}
        {locations.length === 0 ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/8 bg-white/4 px-6 py-8 text-center">
              <MapPin size={28} className="text-white/35" />
              <p className="text-[15px] font-medium text-white/75">
                {dict.cities.empty}
              </p>
              <p className="text-[13px] leading-relaxed text-white/45">
                {dict.cities.emptyHint}
              </p>
            </div>

            {/* Popular cities as quick-start help */}
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-white/40">
                {dict.onboard.pickCity}
              </p>
              <PopularCities onDone={() => {}} />
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {locations.map((loc) => (
                <motion.li
                  key={loc.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 p-3.5 backdrop-blur-xl"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/8">
                    {loc.kind === "gps" ? (
                      <Navigation size={16} className="text-sky-300" />
                    ) : (
                      <MapPin size={16} className="text-white/70" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-medium text-white">
                        {loc.label}
                      </span>
                      {loc.isPrimary && (
                        <span className="rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                          {dict.cities.primary}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-[12px] text-white/45">
                      {[loc.admin1, loc.country].filter(Boolean).join(" · ") ||
                        `${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°`}
                    </span>
                  </span>
                  {busyId === loc.id ? (
                    <Loader2 size={16} className="animate-spin text-white/50" />
                  ) : (
                    <>
                      {!loc.isPrimary && (
                        <button
                          onClick={() => void makePrimary(loc.id)}
                          aria-label={dict.cities.setPrimary}
                          title={dict.cities.setPrimary}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-amber-300/15 hover:text-amber-300"
                        >
                          <Star size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => void remove(loc.id)}
                        aria-label={dict.cities.remove}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-rose-400/15 hover:text-rose-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
