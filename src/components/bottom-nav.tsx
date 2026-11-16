"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, MapPin, Settings } from "lucide-react";
import { useApp } from "./providers";

/**
 * Native-app style bottom tab bar. Fixed, blurred, safe-area aware, with an
 * animated active pill. RTL-aware automatically (flex + logical insets).
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { dict } = useApp();

  const tabs = [
    { href: "/", label: dict.nav.home, icon: Home },
    { href: "/cities", label: dict.nav.cities, icon: MapPin },
    { href: "/settings", label: dict.nav.settings, icon: Settings },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md px-5"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 14px)" }}
      aria-label="Main navigation"
    >
      <div className="grid grid-cols-3 rounded-3xl border border-white/15 bg-slate-950/72 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-2xl">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[13px] font-medium"
            >
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl bg-white/15"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon
                size={18}
                className={active ? "text-white" : "text-white/50"}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={active ? "text-white" : "text-white/50"}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
