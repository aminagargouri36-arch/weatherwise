"use client";

import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { api } from "@/lib/client/api";
import { useApp } from "./providers";

interface City {
  label: string;
  country: string;
  lat: number;
  lon: number;
}

const CITIES: City[] = [
  { label: "Paris", country: "France", lat: 48.8566, lon: 2.3522 },
  { label: "Tunis", country: "Tunisia", lat: 36.8190, lon: 10.1658 },
  { label: "London", country: "UK", lat: 51.5074, lon: -0.1278 },
  { label: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708 },
  { label: "New York", country: "USA", lat: 40.7128, lon: -74.0060 },
  { label: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503 },
  { label: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784 },
  { label: "Casablanca", country: "Morocco", lat: 33.5731, lon: -7.5898 },
];

/**
 * Quick-pick city grid — lets users get started in one tap,
 * no GPS or typing required.
 */
export default function PopularCities({ onDone }: { onDone: () => void }) {
  const { refreshLocations } = useApp();
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

  const pick = async (city: City, idx: number) => {
    setBusyIdx(idx);
    try {
      await api.addLocation({
        label: city.label,
        country: city.country,
        lat: city.lat,
        lon: city.lon,
        kind: "manual",
      });
      await refreshLocations();
      onDone();
    } catch (err) {
      console.error(err);
      alert("Network error: Could not save city. Please check if cookies are enabled.");
    } finally {
      setBusyIdx(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {CITIES.map((city, idx) => (
        <button
          key={city.label}
          onClick={() => void pick(city, idx)}
          disabled={busyIdx !== null}
          className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/8 px-3.5 py-3 text-start backdrop-blur-xl transition-all hover:bg-white/14 active:scale-[0.97] disabled:opacity-50"
        >
          {busyIdx === idx ? (
            <Loader2 size={15} className="shrink-0 animate-spin text-sky-300" />
          ) : (
            <MapPin size={15} className="shrink-0 text-sky-300" />
          )}
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-medium text-white">
              {city.label}
            </span>
            <span className="block truncate text-[11px] text-white/45">
              {city.country}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
