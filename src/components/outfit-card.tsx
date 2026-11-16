"use client";

import { motion } from "framer-motion";
import { Sparkle } from "lucide-react";
import type { OutfitAdvice, Reason } from "@/lib/recommend";
import { useApp } from "./providers";
import { clothesIcon } from "./weather-icons";
import { fmt } from "@/i18n";

/**
 * The clothing advisor card — the heart of WeatherWise. Garments are chosen
 * server-side by the rule engine; here we render them with the translated,
 * human-readable justification for every choice.
 */
export default function OutfitCard({ outfit }: { outfit: OutfitAdvice }) {
  const { dict, prefs } = useApp();

  const localizeReason = (r: Reason): string => {
    const vars: Record<string, string | number> = {};
    for (const [k, v] of Object.entries(r.vars)) {
      if (k === "t") {
        vars[k] =
          prefs.units === "imperial" ? Math.round((v * 9) / 5 + 32) : Math.round(v);
      } else if (k === "d") {
        // Temperature *deltas* scale by 9/5 only — no +32 offset.
        vars[k] =
          prefs.units === "imperial" ? Math.round((v * 9) / 5) : Math.round(v);
      } else if (k === "w") {
        vars[k] =
          prefs.units === "imperial"
            ? `${Math.round(v / 1.609)} mph`
            : `${Math.round(v)} km/h`;
      } else {
        vars[k] = v;
      }
    }
    const template = dict.reasons[r.code] ?? r.code;
    return fmt(template, vars);
  };

  return (
    <section aria-label={dict.home.outfit}>
      <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold tracking-wide text-white/70">
        <Sparkle size={14} className="text-amber-300" />
        {dict.home.outfit}
      </h2>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/6 backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-1 p-3">
          {outfit.base.map((key, i) => {
            const Icon = clothesIcon(key);
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 24 }}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/5 px-1 py-2.5 text-center"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/5">
                  <Icon size={19} className="text-white" strokeWidth={1.9} />
                </span>
                <span className="text-[10.5px] leading-tight text-white/80">
                  {dict.clothes[key] ?? key}
                </span>
              </motion.div>
            );
          })}
        </div>

        {outfit.accessories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-3">
            {outfit.accessories.map((key) => {
              const Icon = clothesIcon(key);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/85"
                >
                  <Icon size={13} className="text-amber-200" />
                  {dict.clothes[key] ?? key}
                </span>
              );
            })}
          </div>
        )}

        <div className="border-t border-white/8 bg-black/15 px-4 py-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
            {dict.home.why}
          </p>
          <ul className="space-y-1">
            {outfit.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-snug text-white/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/80" />
                {localizeReason(r)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
