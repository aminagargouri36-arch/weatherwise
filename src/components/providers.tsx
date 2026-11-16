"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, type Prefs, type SavedLoc } from "@/lib/client/api";
import { dictionaries, fmt, isRTL, resolveLocale, type Dict, type Locale } from "@/i18n";

interface GpsState {
  supported: boolean;
  status: "granted" | "denied" | "prompt" | "unknown";
  busy: boolean;
  requestAndSave: () => Promise<{ lat: number; lon: number }>;
  refreshStatus: () => void;
}

interface AppContextValue {
  status: "loading" | "ready" | "error";
  bootError: string | null;
  retryBoot: () => void;
  prefs: Prefs;
  dict: Dict;
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (section: keyof Dict, key: string, vars?: Record<string, string | number>) => string;
  setLocale: (l: Locale) => Promise<void>;
  updatePrefs: (patch: Partial<Prefs>) => Promise<void>;
  locations: SavedLoc[];
  refreshLocations: () => Promise<void>;
  displayTemp: (celsius: number) => string;
  displayTempDelta: (celsiusDelta: number) => string;
  displayWind: (kmh: number) => string;
  hourLabel: (isoLocal: string) => string;
  gps: GpsState;
  online: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const DEFAULT_PREFS: Prefs = {
  locale: "en",
  units: "metric",
  pushEnabled: false,
  notifyTempShift: true,
  notifyPrecip: true,
  notifyMorning: false,
  morningHour: 7,
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [bootError, setBootError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [locations, setLocations] = useState<SavedLoc[]>([]);
  const [gpsStatus, setGpsStatus] = useState<GpsState["status"]>("unknown");
  const [gpsBusy, setGpsBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const booted = useRef(false);

  const gpsSupported =
    typeof window !== "undefined" && "geolocation" in navigator;

  const boot = useCallback(async () => {
    setStatus("loading");
    setBootError(null);
    try {
      const deviceLocale =
        typeof navigator !== "undefined" ? navigator.language : "en";
      const data = await api.bootstrap(deviceLocale);
      setPrefs({ ...data.user, locale: resolveLocale(data.user.locale) });
      setLocations(data.locations);
      setStatus("ready");
    } catch (err) {
      setBootError(err instanceof ApiError ? err.code : "network");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!booted.current) {
      booted.current = true;
      void boot();
    }
  }, [boot]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // Keep <html lang/dir> in sync the instant the language changes so Arabic
  // flips the whole interface without waiting for a reload.
  const locale = prefs.locale;
  useEffect(() => {
    const el = document.documentElement;
    el.lang = locale;
    el.dir = isRTL(locale) ? "rtl" : "ltr";
    void refreshGpsStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function refreshGpsStatus() {
    if (!gpsSupported) return setGpsStatus("unknown");
    try {
      const perm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
      setGpsStatus(perm.state as GpsState["status"]);
      perm.onchange = () => setGpsStatus(perm.state as GpsState["status"]);
    } catch {
      setGpsStatus("unknown");
    }
  }

  const setLocale = useCallback(
    async (l: Locale) => {
      setPrefs((p) => ({ ...p, locale: l }));
      try {
        const res = await api.updatePrefs({ locale: l });
        setPrefs((p) => ({ ...p, ...res.user, locale: resolveLocale(res.user.locale) }));
      } catch {
        /* optimistic UI already applied; will retry on next change */
      }
    },
    [],
  );

  const updatePrefs = useCallback(async (patch: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    try {
      const res = await api.updatePrefs(patch);
      setPrefs((p) => ({ ...p, ...res.user, locale: resolveLocale(res.user.locale) }));
    } catch {
      /* keep optimistic state */
    }
  }, []);

  const refreshLocations = useCallback(async () => {
    try {
      const res = await api.listLocations();
      setLocations(res.locations);
    } catch {
      /* handled by callers' UI if needed */
    }
  }, []);

  const requestAndSave = useCallback(async () => {
    if (!gpsSupported) throw new ApiError("locationUnsupported");
    setGpsBusy(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 12000,
          maximumAge: 300000,
        });
      }).catch((err: GeolocationPositionError) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus("denied");
          throw new ApiError("locationDenied");
        }
        throw new ApiError("locationTimeout");
      });
      setGpsStatus("granted");
      const { latitude: lat, longitude: lon } = pos.coords;
      const { label } = await api
        .reverse(lat, lon, prefs.locale)
        .catch(() => ({ label: null }));
      // Replace any previous GPS entry so it tracks the user's movement.
      const prevGps = locations.find((l) => l.kind === "gps");
      if (prevGps) await api.removeLocation(prevGps.id).catch(() => undefined);
      await api.addLocation({
        label: label ?? `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
        lat,
        lon,
        kind: "gps",
      });
      await refreshLocations();
      return { lat, lon };
    } finally {
      setGpsBusy(false);
    }
  }, [gpsSupported, prefs.locale, locations, refreshLocations]);

  const value = useMemo<AppContextValue>(() => {
    const dict = dictionaries[prefs.locale] ?? dictionaries.en;
    return {
      status,
      bootError,
      retryBoot: () => void boot(),
      prefs,
      dict,
      locale: prefs.locale,
      dir: isRTL(prefs.locale) ? "rtl" : "ltr",
      t: (section, key, vars) => {
        const group = dict[section] as unknown as Record<string, string>;
        const raw = group?.[key] ?? key;
        return vars ? fmt(raw, vars) : raw;
      },
      setLocale,
      updatePrefs,
      locations,
      refreshLocations,
      displayTemp: (c) =>
        prefs.units === "imperial"
          ? `${Math.round((c * 9) / 5 + 32)}°`
          : `${Math.round(c)}°`,
      displayTempDelta: (d) =>
        prefs.units === "imperial"
          ? `${Math.round((d * 9) / 5)}°`
          : `${Math.round(d)}°`,
      displayWind: (kmh) =>
        prefs.units === "imperial"
          ? `${Math.round(kmh / 1.609)} mph`
          : `${Math.round(kmh)} km/h`,
      hourLabel: (isoLocal) => {
        const h = parseInt(isoLocal.slice(11, 13), 10);
        if (prefs.locale === "ar") {
          return new Intl.DateTimeFormat("ar-TN", { hour: "numeric", hour12: true })
            .format(new Date(2020, 0, 1, h));
        }
        return `${String(h).padStart(2, "0")}:00`;
      },
      gps: {
        supported: gpsSupported,
        status: gpsStatus,
        busy: gpsBusy,
        requestAndSave,
        refreshStatus: () => void refreshGpsStatus(),
      },
      online,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, bootError, prefs, locations, gpsStatus, gpsBusy, online, boot, setLocale, updatePrefs, refreshLocations, requestAndSave, gpsSupported]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
