"use client";

import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Check,
  Download,
  Languages,
  Loader2,
  LocateFixed,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/client/api";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n";
import { useApp } from "@/components/providers";
import Toggle from "@/components/toggle";

type PushState = "unknown" | "on" | "off" | "blocked" | "unsupported";
type InstallState = "standalone" | "prompt" | "unavailable";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Captured outside React because beforeinstallprompt fires once, early.
let deferredInstallPrompt: { prompt: () => void } | null = null;

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: ComponentType<{ size?: number | string; className?: string }>;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/6 backdrop-blur-xl">
      <h2 className="flex items-center gap-2 border-b border-white/8 px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-white/55">
        <Icon size={14} className="text-sky-300" />
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function Row({
  title,
  hint,
  end,
}: {
  title: string;
  hint?: string;
  end?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-white/6 px-4 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-[14.5px] font-medium text-white">{title}</p>
        {hint && <p className="mt-0.5 text-[12px] leading-snug text-white/50">{hint}</p>}
      </div>
      {end}
    </div>
  );
}

export default function SettingsScreen() {
  const { dict, prefs, locale, setLocale, updatePrefs, gps, refreshLocations } = useApp();
  const [push, setPush] = useState<PushState>("unknown");
  const [pushBusy, setPushBusy] = useState(false);
  const [install, setInstall] = useState<InstallState>("unavailable");
  const [confirmWipe, setConfirmWipe] = useState(false);
  const [wiping, setWiping] = useState(false);

  const isIOS =
    typeof navigator !== "undefined" &&
    /iP(hone|ad|od)/.test(navigator.userAgent);

  // ---- Push state detection ------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPush("unsupported");
        return;
      }
      if (typeof Notification === "undefined") {
        setPush("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setPush("blocked");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setPush(sub ? "on" : "off");
      } catch {
        if (!cancelled) setPush("off");
      }
    })();
    // Install state
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    if (standalone) setInstall("standalone");
    else if (deferredInstallPrompt) setInstall("prompt");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredInstallPrompt = e as unknown as { prompt: () => void };
      setInstall("prompt");
    };
    const onInstalled = () => setInstall("standalone");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const enablePush = useCallback(async () => {
    setPushBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPush(perm === "denied" ? "blocked" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await api.vapid();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      await api.subscribePush(sub.toJSON());
      setPush("on");
    } catch {
      setPush("unsupported");
    } finally {
      setPushBusy(false);
    }
  }, []);

  const disablePush = useCallback(async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.unsubscribePush(sub.endpoint, true);
        await sub.unsubscribe();
      }
      setPush("off");
    } catch {
      /* keep state */
    } finally {
      setPushBusy(false);
    }
  }, []);

  const notifChildrenOn = push === "on";

  const wipe = async () => {
    if (!confirmWipe) return setConfirmWipe(true);
    setWiping(true);
    await api.deleteMyData().catch(() => undefined);
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md px-4 pb-32" style={{ paddingTop: "max(env(safe-area-inset-top), 20px)" }}>
      <header className="py-3">
        <h1 className="font-display text-2xl font-bold text-white">{dict.settings.title}</h1>
      </header>

      <div className="space-y-4">
        {/* Language */}
        <Section icon={Languages} title={dict.settings.language}>
          <div className="grid grid-cols-3 gap-2 p-3">
            {LOCALES.map((l: Locale) => (
              <button
                key={l}
                onClick={() => void setLocale(l)}
                className={`relative rounded-2xl border px-2 py-3 text-center transition-all active:scale-95 ${
                  locale === l
                    ? "border-amber-300/60 bg-white/14"
                    : "border-white/8 bg-white/4"
                }`}
                aria-pressed={locale === l}
              >
                {locale === l && (
                  <motion.span
                    layoutId="lang-check"
                    className="absolute -top-1.5 -end-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300"
                  >
                    <Check size={12} className="text-slate-900" strokeWidth={3} />
                  </motion.span>
                )}
                <span className="block text-[10px] font-bold tracking-widest text-white/45">
                  {LOCALE_META[l].flag}
                </span>
                <span
                  className={`mt-0.5 block text-[13.5px] font-medium ${
                    locale === l ? "text-white" : "text-white/65"
                  }`}
                >
                  {LOCALE_META[l].label}
                </span>
              </button>
            ))}
          </div>
        </Section>

        {/* Units */}
        <Section icon={LocateFixed} title={dict.settings.units}>
          <div className="grid grid-cols-2 gap-2 p-3">
            {(["metric", "imperial"] as const).map((u) => (
              <button
                key={u}
                onClick={() => void updatePrefs({ units: u })}
                className={`rounded-2xl border px-3 py-2.5 text-center text-[13px] font-medium transition-all active:scale-95 ${
                  prefs.units === u
                    ? "border-amber-300/60 bg-white/14 text-white"
                    : "border-white/8 bg-white/4 text-white/60"
                }`}
              >
                {u === "metric" ? dict.settings.metric : dict.settings.imperial}
              </button>
            ))}
          </div>
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title={dict.settings.notifications}>
          <Row
            title={dict.settings.notifMaster}
            hint={dict.settings.notifMasterHint}
            end={
              pushBusy ? (
                <Loader2 size={18} className="animate-spin text-white/60" />
              ) : (
                <Toggle
                  on={push === "on"}
                  onChange={(v) => (v ? void enablePush() : void disablePush())}
                  disabled={push === "unsupported" || push === "blocked" || push === "unknown"}
                  label={dict.settings.notifMaster}
                />
              )
            }
          />
          <Row
            title={dict.settings.pushState}
            hint={
              push === "on"
                ? dict.settings.pushOn
                : push === "blocked"
                  ? dict.settings.pushBlocked
                  : push === "unsupported"
                    ? dict.settings.pushUnsupported
                    : dict.settings.pushOff
            }
          />
          <Row
            title={dict.settings.notifTemp}
            hint={dict.settings.notifTempHint}
            end={
              <Toggle
                on={prefs.notifyTempShift && notifChildrenOn}
                onChange={(v) => void updatePrefs({ notifyTempShift: v })}
                disabled={!notifChildrenOn}
                label={dict.settings.notifTemp}
              />
            }
          />
          <Row
            title={dict.settings.notifRain}
            hint={dict.settings.notifRainHint}
            end={
              <Toggle
                on={prefs.notifyPrecip && notifChildrenOn}
                onChange={(v) => void updatePrefs({ notifyPrecip: v })}
                disabled={!notifChildrenOn}
                label={dict.settings.notifRain}
              />
            }
          />
          <Row
            title={dict.settings.notifMorning}
            hint={dict.settings.notifMorningHint}
            end={
              <Toggle
                on={prefs.notifyMorning && notifChildrenOn}
                onChange={(v) => void updatePrefs({ notifyMorning: v })}
                disabled={!notifChildrenOn}
                label={dict.settings.notifMorning}
              />
            }
          />
          <Row
            title={dict.settings.morningAt}
            end={
              <select
                value={prefs.morningHour}
                disabled={!prefs.notifyMorning || !notifChildrenOn}
                onChange={(e) => void updatePrefs({ morningHour: parseInt(e.target.value, 10) })}
                className="rounded-xl border border-white/12 bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
                aria-label={dict.settings.morningAt}
              >
                {[5, 6, 7, 8, 9, 10].map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            }
          />
        </Section>

        {/* Location */}
        <Section icon={LocateFixed} title={dict.settings.locationSection}>
          <Row
            title={dict.settings.gpsStatus}
            hint={
              gps.status === "granted"
                ? dict.settings.gpsGranted
                : gps.status === "denied"
                  ? dict.settings.gpsDenied
                  : dict.settings.gpsPrompt
            }
            end={
              <button
                onClick={() =>
                  void gps
                    .requestAndSave()
                    .then(refreshLocations)
                    .catch(() => gps.refreshStatus())
                }
                disabled={gps.busy || !gps.supported}
                className="rounded-full bg-white/12 px-3.5 py-2 text-[12.5px] font-medium text-white transition-transform active:scale-95 disabled:opacity-40"
              >
                {gps.busy ? <Loader2 size={14} className="animate-spin" /> : dict.onboard.useGps}
              </button>
            }
          />
        </Section>

        {/* Install */}
        <Section icon={Download} title={dict.settings.install}>
          <Row
            title={
              install === "standalone" ? dict.settings.installed : dict.settings.installHint
            }
            hint={
              install === "unavailable" && isIOS ? dict.settings.installIOS : undefined
            }
            end={
              install === "prompt" ? (
                <button
                  onClick={() => deferredInstallPrompt?.prompt()}
                  className="rounded-full bg-emerald-400 px-4 py-2 text-[12.5px] font-semibold text-slate-900 transition-transform active:scale-95"
                >
                  {dict.settings.install}
                </button>
              ) : install === "standalone" ? (
                <Check size={18} className="text-emerald-300" />
              ) : undefined
            }
          />
        </Section>

        {/* Privacy */}
        <Section icon={ShieldCheck} title={dict.settings.privacy}>
          <Row
            title={dict.settings.clearData}
            hint={dict.settings.clearDataHint}
            end={
              <button
                onClick={() => void wipe()}
                disabled={wiping}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-all active:scale-95 ${
                  confirmWipe
                    ? "bg-rose-500 text-white"
                    : "bg-white/10 text-rose-300"
                }`}
              >
                {wiping ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Trash2 size={13} />
                )}
                {confirmWipe ? "?" : dict.settings.clearData}
              </button>
            }
          />
        </Section>

        <p className="pb-2 pt-2 text-center text-[11px] text-white/35">
          {dict.settings.version}
        </p>
      </div>
    </div>
  );
}
