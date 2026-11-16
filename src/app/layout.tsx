import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { Inter, Sora, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/components/providers";
import AppShell from "@/components/app-shell";
import SwRegister from "@/components/sw-register";
import { isRTL, resolveLocale } from "@/i18n";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "WeatherWise",
  title: { default: "WeatherWise", template: "%s · WeatherWise" },
  description:
    "Live weather intelligence with an explainable clothing advisor and smart alerts — in English, Français and العربية.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WeatherWise",
  },
  formatDetection: { telephone: false },
  icons: { apple: "/icons/icon-512.png" },
};

export const viewport: Viewport = {
  themeColor: "#060a18",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const hdrs = await headers();
  // Locale priority: stored preference cookie → device/browser language → en.
  const locale = resolveLocale(
    jar.get("ww_locale")?.value ?? hdrs.get("accept-language"),
  );
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${sora.variable} ${inter.variable} ${arabic.variable}`}
    >
      <body className="min-h-dvh bg-[#060a18] font-sans text-white antialiased">
        <AppProvider>
          <SwRegister />
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
