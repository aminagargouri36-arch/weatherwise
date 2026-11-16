"use client";

import { useEffect, useRef } from "react";
import type { ConditionKind } from "@/lib/weather";

/**
 * The living sky: a full-bleed canvas whose palette, celestial bodies and
 * particle systems are driven by the real forecast (kind + local hour).
 * Rain sheets, drifting snow, lightning flashes, parallax clouds, golden-hour
 * haze and star fields — all procedural, zero image assets, 60fps.
 */

type Palette = [string, string, string];

const PALETTES: Record<"day" | "night", Record<ConditionKind, Palette>> = {
  day: {
    clear: ["#63a8ff", "#a9d2ff", "#eef7ff"],
    cloud: ["#7d94b5", "#aabbd4", "#e7edf6"],
    fog: ["#93a2ad", "#bcc7d1", "#e8edf1"],
    rain: ["#54637a", "#7e8ea6", "#b9c4d3"],
    snow: ["#9db2cc", "#c9d8ec", "#f4f8fd"],
    storm: ["#2c3448", "#4b5570", "#7a86a1"],
  },
  night: {
    clear: ["#050b21", "#0d1a40", "#1e3069"],
    cloud: ["#080f24", "#141f3a", "#29395c"],
    fog: ["#10192a", "#202d44", "#364862"],
    rain: ["#080d1c", "#131c31", "#232f47"],
    snow: ["#0e1830", "#213050", "#394a6e"],
    storm: ["#090d19", "#161c30", "#2b3450"],
  },
};

interface Props {
  kind: ConditionKind;
  isDay: boolean;
  hour: number; // 0-23 local
  intensity?: number; // 0..1 participation of particles
}

interface Star { x: number; y: number; r: number; tw: number; }
interface CloudBlob { x: number; y: number; s: number; v: number; o: number; }
interface Drop { x: number; y: number; l: number; v: number; }
interface Flake { x: number; y: number; r: number; v: number; ph: number; }

export default function SkyCanvas({ kind, isDay, hour, intensity = 1 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({ kind, isDay, hour, intensity });
  stateRef.current = { kind, isDay, hour, intensity };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const stars: Star[] = [];
    const clouds: CloudBlob[] = [];
    const drops: Drop[] = [];
    const flakes: Flake[] = [];
    let lightning = 0; // opacity of current flash
    let nextBolt = 4 + Math.random() * 6;

    function resize() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function seed() {
      stars.length = 0;
      clouds.length = 0;
      drops.length = 0;
      flakes.length = 0;
      for (let i = 0; i < 90; i++) {
        stars.push({ x: Math.random() * w, y: Math.random() * h * 0.7, r: Math.random() * 1.3 + 0.3, tw: Math.random() * Math.PI * 2 });
      }
      for (let i = 0; i < 7; i++) {
        clouds.push({
          x: Math.random() * w,
          y: h * (0.08 + Math.random() * 0.45),
          s: 60 + Math.random() * 130,
          v: 4 + Math.random() * 9,
          o: 0.10 + Math.random() * 0.16,
        });
      }
      const dropCount = kind === "storm" ? 130 : kind === "rain" ? 90 : 0;
      const flakeCount = kind === "snow" ? 110 : 0;
      for (let i = 0; i < dropCount * stateRef.current.intensity; i++) {
        drops.push({ x: Math.random() * w, y: Math.random() * h, l: 10 + Math.random() * 16, v: 380 + Math.random() * 260 });
      }
      for (let i = 0; i < flakeCount * stateRef.current.intensity; i++) {
        flakes.push({ x: Math.random() * w, y: Math.random() * h, r: 1 + Math.random() * 2.4, v: 22 + Math.random() * 34, ph: Math.random() * Math.PI * 2 });
      }
    }

    function lerpColor(a: string, b: string, t: number): string {
      const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
      const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
      return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
    }

    let last = performance.now();
    function frame(now: number) {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { kind, isDay, hour } = stateRef.current;

      const palette = PALETTES[isDay ? "day" : "night"][kind] ?? PALETTES.day.cloud;

      // Golden-hour warmth near sunrise/sunset
      const golden = isDay && ((hour >= 6 && hour < 9) || (hour >= 17 && hour < 20));
      let [c0, c1, c2] = palette;
      if (golden) c2 = lerpColor(c2, "#ffd9a3", 0.45);

      const grad = ctx!.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, c0);
      grad.addColorStop(0.55, c1);
      grad.addColorStop(1, c2);
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      const t = now / 1000;

      // Celestial body
      if (kind === "clear") {
        if (isDay) {
          const sunY = h * (0.42 - 0.25 * Math.sin(((hour - 6) / 12) * Math.PI));
          const sx = w * 0.5;
          const glow = ctx!.createRadialGradient(sx, sunY, 0, sx, sunY, h * 0.5);
          glow.addColorStop(0, "rgba(255,244,214,0.95)");
          glow.addColorStop(0.25, "rgba(255,236,180,0.35)");
          glow.addColorStop(1, "rgba(255,236,180,0)");
          ctx!.fillStyle = glow;
          ctx!.fillRect(0, 0, w, h);
          ctx!.beginPath();
          ctx!.arc(sx, sunY, 26, 0, Math.PI * 2);
          ctx!.fillStyle = "rgba(255,250,230,0.95)";
          ctx!.fill();
        } else {
          const mx = w * 0.72;
          const my = h * 0.2;
          const glow = ctx!.createRadialGradient(mx, my, 0, mx, my, 120);
          glow.addColorStop(0, "rgba(220,230,255,0.55)");
          glow.addColorStop(1, "rgba(220,230,255,0)");
          ctx!.fillStyle = glow;
          ctx!.fillRect(0, 0, w, h);
          ctx!.beginPath();
          ctx!.arc(mx, my, 20, 0, Math.PI * 2);
          ctx!.fillStyle = "rgba(232,238,255,0.95)";
          ctx!.fill();
          ctx!.beginPath();
          ctx!.arc(mx - 7, my - 4, 17, 0, Math.PI * 2);
          ctx!.fillStyle = c0;
          ctx!.globalAlpha = 0.25;
          ctx!.fill();
          ctx!.globalAlpha = 1;
        }
      }

      // Stars at night
      if (!isDay && (kind === "clear" || kind === "cloud")) {
        for (const s of stars) {
          const a = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.4 + s.tw));
          ctx!.globalAlpha = a;
          ctx!.fillStyle = "#eaf1ff";
          ctx!.beginPath();
          ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.globalAlpha = 1;
      }

      // Clouds
      if (kind !== "clear") {
        const col = isDay ? "255,255,255" : "200,214,238";
        for (const c of clouds) {
          c.x += c.v * dt;
          if (c.x - c.s > w) c.x = -c.s * 1.4;
          ctx!.fillStyle = `rgba(${col},${c.o * (kind === "storm" ? 1.25 : 1)})`;
          for (let k = 0; k < 3; k++) {
            ctx!.beginPath();
            ctx!.ellipse(c.x + k * c.s * 0.42, c.y + Math.sin(t * 0.2 + k) * 3, c.s * (0.5 - k * 0.07), c.s * 0.3, 0, 0, Math.PI * 2);
            ctx!.fill();
          }
        }
      }

      // Rain
      if (kind === "rain" || kind === "storm") {
        ctx!.strokeStyle = isDay ? "rgba(230,240,255,0.5)" : "rgba(190,210,245,0.42)";
        ctx!.lineWidth = 1.1;
        for (const d of drops) {
          d.y += d.v * dt;
          d.x += d.v * dt * 0.12;
          if (d.y > h) { d.y = -20; d.x = Math.random() * w; }
          ctx!.beginPath();
          ctx!.moveTo(d.x, d.y);
          ctx!.lineTo(d.x + d.l * 0.12, d.y + d.l);
          ctx!.stroke();
        }
      }

      // Snow
      if (kind === "snow") {
        ctx!.fillStyle = "rgba(255,255,255,0.85)";
        for (const f of flakes) {
          f.y += f.v * dt;
          f.x += Math.sin(t + f.ph) * 18 * dt;
          if (f.y > h) { f.y = -6; f.x = Math.random() * w; }
          ctx!.beginPath();
          ctx!.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Lightning
      if (kind === "storm") {
        nextBolt -= dt;
        if (nextBolt <= 0) {
          lightning = 0.55 + Math.random() * 0.3;
          nextBolt = 3.5 + Math.random() * 7;
        }
        if (lightning > 0.01) {
          ctx!.fillStyle = `rgba(210,222,255,${lightning * 0.35})`;
          ctx!.fillRect(0, 0, w, h);
          lightning *= 0.86;
        }
      }

      // Fog bands
      if (kind === "fog") {
        for (let i = 0; i < 3; i++) {
          const y = h * (0.25 + i * 0.22) + Math.sin(t * 0.25 + i * 2) * 12;
          const band = ctx!.createLinearGradient(0, y - 34, 0, y + 34);
          band.addColorStop(0, "rgba(255,255,255,0)");
          band.addColorStop(0.5, isDay ? "rgba(255,255,255,0.20)" : "rgba(190,205,230,0.12)");
          band.addColorStop(1, "rgba(255,255,255,0)");
          ctx!.fillStyle = band;
          ctx!.fillRect(0, y - 34, w, 68);
        }
      }

      if (!reduced) raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
}
