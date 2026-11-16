import {
  Sun,
  Moon,
  MoonStar,
  CloudSun,
  CloudMoon,
  Cloudy,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  CloudSnow,
  CloudHail,
  CloudLightning,
  Shirt,
  Layers,
  Layers2,
  Wind,
  ThermometerSnowflake,
  Footprints,
  Umbrella,
  Glasses,
  Snowflake,
  Flame,
  Hand,
  GlassWater,
  Sparkles,
  Droplets,
  type LucideIcon,
} from "lucide-react";
import type { ConditionKey } from "@/lib/weather";

export function conditionIcon(key: ConditionKey, isDay: boolean): LucideIcon {
  switch (key) {
    case "clear":
      return isDay ? Sun : MoonStar;
    case "mostlyClear":
      return isDay ? CloudSun : Moon;
    case "partlyCloudy":
      return isDay ? CloudSun : CloudMoon;
    case "overcast":
      return Cloudy;
    case "fog":
      return CloudFog;
    case "drizzle":
      return CloudDrizzle;
    case "lightRain":
    case "showers":
      return CloudRain;
    case "rain":
      return CloudRain;
    case "heavyRain":
      return CloudRainWind;
    case "freezingRain":
    case "sleet":
      return CloudHail;
    case "lightSnow":
    case "snow":
    case "heavySnow":
      return CloudSnow;
    case "thunderstorm":
      return CloudLightning;
    default:
      return CloudSun;
  }
}

const CLOTHES_ICONS: Record<string, LucideIcon> = {
  tshirt: Shirt,
  longSleeve: Shirt,
  sweater: Layers,
  fleece: Layers2,
  lightJacket: Layers,
  windbreaker: Wind,
  coat: Layers2,
  raincoat: CloudRain,
  thermal: ThermometerSnowflake,
  shorts: Sun,
  trousers: Layers,
  warmTrousers: Layers2,
  sneakers: Footprints,
  boots: Footprints,
  waterproofShoes: Droplets,
  umbrella: Umbrella,
  sunglasses: Glasses,
  cap: Sun,
  beanie: Snowflake,
  gloves: Hand,
  scarf: Flame,
  sunscreen: Sparkles,
  water: GlassWater,
};

export function clothesIcon(key: string): LucideIcon {
  return CLOTHES_ICONS[key] ?? Shirt;
}
