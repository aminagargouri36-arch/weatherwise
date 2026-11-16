"use client";

import { Droplets, Eye, Sun, Thermometer, Umbrella, Wind } from "lucide-react";
import type { Forecast } from "@/lib/weather";
import { useApp } from "./providers";

/** Six live weather vitals in a glass tile grid. */
export default function MetricGrid({ forecast }: { forecast: Forecast }) {
  const { dict, displayTemp, displayWind, locale, hourLabel } = useApp();
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-TN" : locale === "fr" ? "fr-FR" : "en-GB");

  const tiles = [
    {
      icon: Thermometer,
      label: dict.home.feelsLike,
      value: displayTemp(forecast.now.feels),
      tint: "text-orange-300",
    },
    {
      icon: Droplets,
      label: dict.home.humidity,
      value: `${nf.format(forecast.now.humidity)}%`,
      tint: "text-sky-300",
    },
    {
      icon: Wind,
      label: dict.home.wind,
      value: displayWind(forecast.now.wind),
      sub: `${nf.format(forecast.now.windDir)}°`,
      tint: "text-teal-300",
    },
    {
      icon: Umbrella,
      label: dict.home.precip,
      value: `${nf.format(Math.round(forecast.today.precipProb))}%`,
      tint: "text-indigo-300",
    },
    {
      icon: Sun,
      label: dict.home.uv,
      value: nf.format(Math.round(forecast.today.uvMax)),
      tint: "text-amber-300",
    },
    {
      icon: Eye,
      label: dict.home.visibility,
      value: `${nf.format(Math.round(forecast.now.visibilityKm))} km`,
      sub: `${hourLabel(forecast.today.sunrise)} – ${hourLabel(forecast.today.sunset)}`,
      tint: "text-violet-300",
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="flex flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/6 p-3 backdrop-blur-xl"
        >
          <t.icon size={17} className={t.tint} strokeWidth={2} />
          <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">
            {t.label}
          </span>
          <span className="text-[15px] font-semibold text-white tabular-nums">{t.value}</span>
          {t.sub && <span className="text-[10px] text-white/45 tabular-nums">{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}
