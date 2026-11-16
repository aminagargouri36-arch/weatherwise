"use client";

import { RefreshCw, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "./providers";

/** Full-screen boot skeleton with the app mark. */
export function BootSkeleton() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-slate-950">
      <motion.div
        animate={{ scale: [1, 1.12, 1], rotate: [0, 8, -8, 0] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-gradient-to-br from-sky-400 to-indigo-600 shadow-2xl shadow-indigo-900/60"
      >
        <span className="text-3xl font-black text-white">W</span>
      </motion.div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-sky-300"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.18 }}
          />
        ))}
      </div>
    </div>
  );
}

/** Content skeleton for the home screen while the forecast loads. */
export function HomeSkeleton() {
  return (
    <div className="mx-auto min-h-dvh max-w-md animate-pulse space-y-4 px-4 pb-32 pt-14">
      <div className="space-y-3 rounded-3xl bg-white/5 p-6">
        <div className="mx-auto h-4 w-32 rounded bg-white/10" />
        <div className="mx-auto h-24 w-40 rounded-2xl bg-white/10" />
        <div className="mx-auto h-4 w-48 rounded bg-white/10" />
      </div>
      <div className="h-36 rounded-3xl bg-white/5" />
      <div className="h-56 rounded-3xl bg-white/5" />
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/5" />
        ))}
      </div>
    </div>
  );
}

/** Friendly error panel with retry. */
export function ErrorCard({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const { dict } = useApp();
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/6 p-8 text-center backdrop-blur-xl">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-400/15">
        <WifiOff size={24} className="text-rose-300" />
      </span>
      <p className="text-sm leading-relaxed text-white/80">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-transform active:scale-95"
        >
          <RefreshCw size={15} />
          {dict.common.retry}
        </button>
      )}
    </div>
  );
}
