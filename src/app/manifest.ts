import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "WeatherWise — Dress for the sky",
    short_name: "WeatherWise",
    description:
      "Live forecasts, hourly curves and an explainable clothing advisor with smart weather-change alerts.",
    lang: "en",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#060a18",
    theme_color: "#060a18",
    categories: ["weather", "lifestyle", "utilities"],
    icons: [
      { src: "/icons/icon-512.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
