import type { Forecast } from "./weather";

/**
 * WeatherWise clothing intelligence.
 *
 * The engine is intentionally rule-based and legible: every garment it emits
 * is justified by an explicit, user-readable reason key (translated in the UI).
 * Inputs come from the real forecast (feels-like now, precipitation envelope
 * over the next 12h, wind, UV and the day's temperature swing).
 */

export interface Reason {
  code: string; // key into i18n `reasons`
  vars: Record<string, number>;
}

export interface OutfitAdvice {
  base: string[]; // ordered clothing keys (i18n `clothes`)
  accessories: string[];
  reasons: Reason[];
  primary: Reason; // headline reason (used in notifications)
}

function pushUnique(list: string[], key: string) {
  if (!list.includes(key)) list.push(key);
}

function replace(list: string[], from: string[], to: string) {
  const idx = list.findIndex((k) => from.includes(k));
  if (idx >= 0) list[idx] = to;
  else pushUnique(list, to);
}

export function buildOutfit(fc: Forecast): OutfitAdvice {
  const feels = fc.now.feels;
  const nextHours = fc.hours.slice(0, 12);
  const precipProb = Math.max(0, ...nextHours.map((h) => h.precipProb));
  const willSnow = nextHours.some((h) => h.kind === "snow");
  const windMax = Math.max(0, ...nextHours.map((h) => h.wind));
  const uvMax = fc.today.uvMax;
  const swing = Math.round((fc.today.max - fc.today.min) * 10) / 10;

  const base: string[] = [];
  const accessories: string[] = [];
  const reasons: Reason[] = [];
  let primary: Reason;

  // ---- Temperature band (core layering) -------------------------------
  if (feels < 0) {
    base.push("thermal", "sweater", "coat", "warmTrousers", "boots");
    accessories.push("beanie", "gloves", "scarf");
    primary = { code: "freezing", vars: { t: Math.round(feels) } };
  } else if (feels < 8) {
    base.push("longSleeve", "sweater", "coat", "trousers", "sneakers");
    accessories.push("beanie");
    primary = { code: "cold", vars: { t: Math.round(feels) } };
  } else if (feels < 14) {
    base.push("longSleeve", "lightJacket", "trousers", "sneakers");
    primary = { code: "chilly", vars: { t: Math.round(feels) } };
  } else if (feels < 20) {
    base.push("tshirt", "trousers", "sneakers");
    if (swing >= 8) pushUnique(base, "lightJacket");
    primary = { code: "mild", vars: { t: Math.round(feels) } };
  } else if (feels < 27) {
    base.push("tshirt", feels >= 24 ? "shorts" : "trousers", "sneakers");
    primary = { code: "warm", vars: { t: Math.round(feels) } };
  } else {
    base.push("tshirt", "shorts", "sneakers");
    accessories.push("cap", "water");
    primary = { code: "hot", vars: { t: Math.round(feels) } };
  }
  reasons.push(primary);

  // ---- Precipitation envelope ----------------------------------------
  if (willSnow) {
    replace(base, ["sneakers"], "boots");
    pushUnique(accessories, "gloves");
    pushUnique(base, "coat");
    reasons.push({ code: "snowLikely", vars: {} });
    if (primary.code === "mild" || primary.code === "warm") {
      primary = { code: "snowLikely", vars: {} };
    }
  } else if (precipProb >= 55) {
    pushUnique(accessories, "umbrella");
    replace(base, ["lightJacket", "windbreaker"], "raincoat");
    if (!base.includes("raincoat") && feels < 20) pushUnique(base, "raincoat");
    if (feels >= 8) replace(base, ["sneakers"], "waterproofShoes");
    const r: Reason = { code: "rainLikely", vars: { p: precipProb } };
    reasons.push(r);
    if (["mild", "warm", "chilly"].includes(primary.code)) primary = r;
  } else if (precipProb >= 30) {
    pushUnique(accessories, "umbrella");
    reasons.push({ code: "rainPossible", vars: { p: precipProb } });
  }

  // ---- Wind -----------------------------------------------------------
  if (windMax >= 30) {
    if (base.includes("lightJacket")) replace(base, ["lightJacket"], "windbreaker");
    else if (feels < 20) pushUnique(base, "windbreaker");
    reasons.push({ code: "windStrong", vars: { w: windMax } });
  }

  // ---- UV -------------------------------------------------------------
  if (uvMax >= 6 && fc.now.isDay) {
    pushUnique(accessories, "sunglasses");
    pushUnique(accessories, "sunscreen");
    reasons.push({ code: "uvHigh", vars: { u: Math.round(uvMax) } });
  }

  // ---- Big day swing → layering advice --------------------------------
  if (swing >= 10) {
    reasons.push({ code: "swingBig", vars: { d: Math.round(swing) } });
    if (!base.includes("lightJacket") && !base.includes("sweater") && feels >= 10 && feels < 24) {
      pushUnique(base, "lightJacket");
    }
  }

  return { base, accessories, reasons, primary };
}

/** Short notification-localizable advice from an outfit (e.g. "umbrella"). */
export function outfitTipKey(outfit: OutfitAdvice): string | null {
  if (outfit.accessories.includes("umbrella")) return "umbrella";
  if (outfit.base.includes("raincoat")) return "raincoat";
  if (outfit.base.includes("coat")) return "coat";
  if (outfit.base.includes("lightJacket")) return "lightJacket";
  if (outfit.base.includes("shorts")) return "shorts";
  return null;
}
