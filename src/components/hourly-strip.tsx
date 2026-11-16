"use client";

import type { HourPoint } from "@/lib/weather";
import { useApp } from "./providers";
import { conditionIcon } from "./weather-icons";

/**
 * "Hour by hour": a horizontally scrollable strip with a hand-drawn-feeling
 * SVG temperature spline, precip probability bars and condition icons.
 * The chart axis stays LTR (time flows left→right) even in Arabic UI.
 */
export default function HourlyStrip({ hours }: { hours: HourPoint[] }) {
  const { dict, displayTemp, hourLabel, locale } = useApp();
  if (!hours.length) return null;

  const temps = hours.map((h) => h.t);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span = Math.max(2, max - min);
  const COL_W = 64;
  const CHART_H = 56;
  const W = hours.length * COL_W;

  const y = (t: number) => CHART_H - 8 - ((t - min) / span) * (CHART_H - 18);
  const pts = hours.map((h, i) => [i * COL_W + COL_W / 2, y(h.t)] as const);

  // Smooth cubic spline through points
  let path = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    path += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }

  return (
    <section aria-label={dict.home.hourly}>
      <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-white/70">
        {dict.home.hourly}
      </h2>
      <div
        dir="ltr"
        className="overflow-x-auto rounded-3xl border border-white/10 bg-white/6 backdrop-blur-xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div style={{ width: W }} className="relative px-0 pt-4">
          <div className="flex">
            {hours.map((h, i) => {
              const Icon = conditionIcon(h.condition, h.isDay);
              const isNow = i === 0;
              return (
                <div key={h.time} style={{ width: COL_W }} className="flex flex-col items-center gap-1">
                  <span className={`text-[11px] font-medium ${isNow ? "text-amber-300" : "text-white/55"}`}>
                    {isNow ? dict.home.now : hourLabel(h.time)}
                  </span>
                  <Icon size={18} className="text-white/85" strokeWidth={1.8} />
                  <span className="text-[13px] font-semibold text-white">
                    {displayTemp(h.t)}
                  </span>
                </div>
              );
            })}
          </div>

          <svg width={W} height={CHART_H} className="block" aria-hidden="true">
            <defs>
              <linearGradient id="tempCurve" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            <path d={path} fill="none" stroke="url(#tempCurve)" strokeWidth="2.5" strokeLinecap="round" />
            {pts.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={i === 0 ? 3.5 : 2} fill={i === 0 ? "#fbbf24" : "#bfdbfe"} />
            ))}
          </svg>

          <div className="flex pb-3 pt-1">
            {hours.map((h) => (
              <div key={h.time + "-p"} style={{ width: COL_W }} className="flex flex-col items-center gap-1">
                <div className="flex h-7 w-1.5 items-end overflow-hidden rounded-full bg-white/8">
                  <div
                    className="w-full rounded-full bg-sky-400/80"
                    style={{ height: `${Math.min(100, h.precipProb)}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-sky-200/80">
                  {locale === "ar"
                    ? new Intl.NumberFormat("ar-TN").format(Math.round(h.precipProb))
                    : Math.round(h.precipProb)}
                  %
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
