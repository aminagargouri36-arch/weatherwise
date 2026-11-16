"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { useApp } from "./providers";
import Onboarding from "./onboarding";
import BottomNav from "./bottom-nav";
import { BootSkeleton } from "./states";

const ONBOARD_KEY = "ww_onboarded";

/**
 * Native-app chrome controller:
 *  boot spinner → (boot error + retry) → onboarding (first launch,
 *  no locations) → screen + bottom tabs.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { status, bootError, retryBoot, locations } = useApp();
  const [onboarded, setOnboarded] = useState(true);

  useEffect(() => {
    setOnboarded(localStorage.getItem(ONBOARD_KEY) === "1");
  }, []);

  if (status === "loading") return <BootSkeleton />;

  if (status === "error") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-slate-950 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-rose-500/15 text-2xl font-black text-rose-300">
          W
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-white/70">
          {bootError === "network"
            ? "No connection. Check your network and retry. / Pas de connexion. / لا يوجد اتصال."
            : "Something went wrong. / Un problème est survenu. / حدث خطأ ما."}
        </p>
        <button
          onClick={retryBoot}
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 active:scale-95"
        >
          <RefreshCw size={15} />
          Retry · Réessayer · إعادة
        </button>
      </div>
    );
  }

  if (!onboarded && locations.length === 0) {
    return (
      <Onboarding
        onDone={() => {
          localStorage.setItem(ONBOARD_KEY, "1");
          setOnboarded(true);
        }}
      />
    );
  }

  return (
    <>
      {children}
      <BottomNav />
    </>
  );
}
