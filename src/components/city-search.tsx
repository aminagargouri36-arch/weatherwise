"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { api } from "@/lib/client/api";
import { useApp } from "./providers";

interface Place {
  label: string;
  country: string | null;
  admin1: string | null;
  lat: number;
  lon: number;
}

/** Debounced place search hitting our server-side geocoding proxy. */
export default function CitySearch({
  onPick,
  autoFocus,
}: {
  onPick: (place: Place) => void;
  autoFocus?: boolean;
}) {
  const { dict, locale } = useApp();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.searchPlaces(q.trim(), locale);
        setResults(res.results);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 320);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, locale]);

  return (
    <div>
      <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/8 px-3.5 py-3 backdrop-blur-xl focus-within:border-white/30">
        <Search size={17} className="shrink-0 text-white/50" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={dict.cities.search}
          autoFocus={autoFocus}
          className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/40"
          type="search"
          aria-label={dict.cities.search}
        />
        {searching && <Loader2 size={16} className="animate-spin text-white/50" />}
      </div>

      {results.length > 0 && (
        <ul className="mt-2 divide-y divide-white/6 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl">
          {results.map((p, i) => (
            <li key={`${p.lat},${p.lon},${i}`}>
              <button
                onClick={() => {
                  onPick(p);
                  setQ("");
                  setResults([]);
                  setSearched(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors hover:bg-white/6 active:bg-white/10"
              >
                <MapPin size={16} className="shrink-0 text-sky-300" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-white">
                    {p.label}
                  </span>
                  <span className="block truncate text-[12px] text-white/50">
                    {[p.admin1, p.country].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && !searching && (
        <p className="mt-3 px-1 text-sm text-white/50">{dict.cities.noResults}</p>
      )}
    </div>
  );
}
