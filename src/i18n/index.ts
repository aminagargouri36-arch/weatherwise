export type Locale = "en" | "fr" | "ar";

export const LOCALES: Locale[] = ["en", "fr", "ar"];

export const LOCALE_META: Record<
  Locale,
  { label: string; flag: string; dir: "ltr" | "rtl"; intl: string }
> = {
  en: { label: "English", flag: "GB", dir: "ltr", intl: "en-GB" },
  fr: { label: "Français", flag: "FR", dir: "ltr", intl: "fr-FR" },
  ar: { label: "العربية", flag: "TN", dir: "rtl", intl: "ar-TN" },
};

export function isRTL(locale: Locale) {
  return LOCALE_META[locale].dir === "rtl";
}

export function resolveLocale(input?: string | null): Locale {
  if (!input) return "en";
  const short = input.toLowerCase().split(/[-_]/)[0];
  return (LOCALES as string[]).includes(short) ? (short as Locale) : "en";
}

/** Tiny template formatter: fmt("Feels like {t}°", { t: 12 }) */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  );
}

export interface Dict {
  app: { name: string; tagline: string };
  nav: { home: string; cities: string; settings: string };
  onboard: {
    welcome: string;
    subtitle: string;
    useGps: string;
    pickCity: string;
    gpsHint: string;
    skip: string;
    start: string;
  };
  home: {
    feelsLike: string;
    humidity: string;
    wind: string;
    precip: string;
    uv: string;
    visibility: string;
    hourly: string;
    outfit: string;
    why: string;
    today: string;
    now: string;
    updated: string;
    refresh: string;
    high: string;
    low: string;
    swing: string;
  };
  conditions: Record<string, string>;
  clothes: Record<string, string>;
  reasons: Record<string, string>;
  cities: {
    title: string;
    search: string;
    add: string;
    current: string;
    primary: string;
    setPrimary: string;
    remove: string;
    empty: string;
    emptyHint: string;
    noResults: string;
  };
  settings: {
    title: string;
    language: string;
    units: string;
    metric: string;
    imperial: string;
    notifications: string;
    notifMaster: string;
    notifMasterHint: string;
    notifTemp: string;
    notifTempHint: string;
    notifRain: string;
    notifRainHint: string;
    notifMorning: string;
    notifMorningHint: string;
    morningAt: string;
    locationSection: string;
    gpsStatus: string;
    gpsGranted: string;
    gpsDenied: string;
    gpsPrompt: string;
    privacy: string;
    clearData: string;
    clearDataHint: string;
    install: string;
    installHint: string;
    installIOS: string;
    installed: string;
    version: string;
    pushState: string;
    pushOn: string;
    pushOff: string;
    pushBlocked: string;
    pushUnsupported: string;
  };
  notify: {
    tempShiftTitle: string;
    tempShiftBody: string;
    rainShiftTitle: string;
    rainShiftBody: string;
    clearShiftBody: string;
    morningTitle: string;
    morningBody: string;
  };
  errors: {
    network: string;
    weatherDown: string;
    locationDenied: string;
    locationTimeout: string;
    locationUnsupported: string;
    cityRequired: string;
    generic: string;
  };
  common: {
    retry: string;
    cancel: string;
    save: string;
    done: string;
    close: string;
    offline: string;
    online: string;
  };
}

const en: Dict = {
  app: { name: "WeatherWise", tagline: "Dress right for the sky above you" },
  nav: { home: "Today", cities: "Cities", settings: "Settings" },
  onboard: {
    welcome: "Welcome to WeatherWise",
    subtitle:
      "Live forecasts, hourly curves and a clothing advisor that watches the sky for you — even when the app is closed.",
    useGps: "Use my location",
    pickCity: "Search for a city",
    gpsHint: "WeatherWise uses GPS only to fetch your local forecast. Your location is stored securely on our server and never shared.",
    skip: "Not now",
    start: "Get started",
  },
  home: {
    feelsLike: "Feels like",
    humidity: "Humidity",
    wind: "Wind",
    precip: "Precipitation",
    uv: "UV index",
    visibility: "Visibility",
    hourly: "Hour by hour",
    outfit: "What to wear",
    why: "Why this outfit",
    today: "Today's outlook",
    now: "Now",
    updated: "Updated",
    refresh: "Refresh",
    high: "High",
    low: "Low",
    swing: "temperature swing",
  },
  conditions: {
    clear: "Clear sky",
    mostlyClear: "Mostly clear",
    partlyCloudy: "Partly cloudy",
    overcast: "Overcast",
    fog: "Foggy",
    drizzle: "Drizzle",
    lightRain: "Light rain",
    rain: "Rain",
    heavyRain: "Heavy rain",
    freezingRain: "Freezing rain",
    lightSnow: "Light snow",
    snow: "Snow",
    heavySnow: "Heavy snow",
    sleet: "Sleet",
    showers: "Showers",
    thunderstorm: "Thunderstorm",
  },
  clothes: {
    tshirt: "T-shirt",
    longSleeve: "Long-sleeve top",
    sweater: "Sweater",
    fleece: "Fleece",
    lightJacket: "Light jacket",
    windbreaker: "Windbreaker",
    coat: "Warm coat",
    raincoat: "Raincoat",
    thermal: "Thermal base layer",
    shorts: "Shorts",
    trousers: "Trousers",
    warmTrousers: "Warm trousers",
    sneakers: "Sneakers",
    boots: "Boots",
    waterproofShoes: "Waterproof shoes",
    umbrella: "Umbrella",
    sunglasses: "Sunglasses",
    cap: "Cap or hat",
    beanie: "Beanie",
    gloves: "Gloves",
    scarf: "Scarf",
    sunscreen: "Sunscreen",
    water: "Water bottle",
  },
  reasons: {
    freezing: "It's near freezing ({t}°) — insulate well.",
    cold: "Cold air ({t}°) calls for real layers.",
    chilly: "A crisp {t}° — a light layer will do.",
    mild: "Comfortable {t}° — dress light and flexible.",
    warm: "Warm {t}° ahead — breathable fabrics.",
    hot: "Hot {t}° — stay cool and hydrated.",
    rainLikely: "Rain is likely ({p}% chance) — stay dry.",
    rainPossible: "A {p}% chance of rain — plan for it.",
    snowLikely: "Snow expected — grip and warmth matter.",
    windStrong: "Gusts near {w} — windproof yourself.",
    uvHigh: "UV index {u} — protect your skin.",
    swingBig: "A {d}° swing across the day — layer up to adapt.",
  },
  cities: {
    title: "Your cities",
    search: "Search a city, town, or village…",
    add: "Add",
    current: "Current location",
    primary: "Home city",
    setPrimary: "Make home city",
    remove: "Remove",
    empty: "No cities yet",
    emptyHint: "Add a city above or use your GPS location to get started.",
    noResults: "No places match your search.",
  },
  settings: {
    title: "Settings",
    language: "Language",
    units: "Units",
    metric: "Celsius · km/h",
    imperial: "Fahrenheit · mph",
    notifications: "Notifications",
    notifMaster: "Weather alerts",
    notifMasterHint: "Real push alerts from our weather watcher, even when the app is closed.",
    notifTemp: "Temperature shifts",
    notifTempHint: "When the forecast changes enough to change your outfit.",
    notifRain: "Rain & snow alerts",
    notifRainHint: "When rain appears or disappears in the forecast.",
    notifMorning: "Morning briefing",
    notifMorningHint: "One outfit briefing every morning.",
    morningAt: "Briefing time",
    locationSection: "Location",
    gpsStatus: "GPS permission",
    gpsGranted: "Granted — local forecast follows you.",
    gpsDenied: "Denied — add cities manually in the Cities tab.",
    gpsPrompt: "Not decided yet — WeatherWise will ask when needed.",
    privacy: "Privacy",
    clearData: "Delete my data",
    clearDataHint: "Erases your cities, preferences and push registration from our server.",
    install: "Install the app",
    installHint: "Install WeatherWise on your home screen for the full app experience and notifications.",
    installIOS: "On iPhone: Share → Add to Home Screen.",
    installed: "Installed — running as an app.",
    version: "WeatherWise 1.0 — forecast intelligence",
    pushState: "Push status",
    pushOn: "Active on this device",
    pushOff: "Not active",
    pushBlocked: "Blocked by the browser — enable notifications in system settings.",
    pushUnsupported: "This device can receive push alerts only after installing the app.",
  },
  notify: {
    tempShiftTitle: "Weather changed — rethink your outfit",
    tempShiftBody: "{place}: now heading to {t}° ({dir}). {tip}",
    rainShiftTitle: "Rain moved in",
    rainShiftBody: "{place}: {p}% chance of precipitation today. {tip}",
    clearShiftBody: "{place}: sky cleared up. {tip}",
    morningTitle: "Your morning outfit briefing",
    morningBody: "{place}: {t}° now, high {h}°. {tip}",
  },
  errors: {
    network: "No connection. Check your network and retry.",
    weatherDown: "The weather service is unavailable right now. Retry in a moment.",
    locationDenied: "Location permission denied. You can still add cities manually.",
    locationTimeout: "Could not get your position in time. Try again or pick a city.",
    locationUnsupported: "This device does not support geolocation.",
    cityRequired: "Add a city or enable your location first.",
    generic: "Something went wrong since the last update.",
  },
  common: {
    retry: "Retry",
    cancel: "Cancel",
    save: "Save",
    done: "Done",
    close: "Close",
    offline: "Offline — showing last synced forecast",
    online: "Back online",
  },
};

const fr: Dict = {
  app: { name: "WeatherWise", tagline: "Habillez-vous selon le ciel" },
  nav: { home: "Aujourd'hui", cities: "Villes", settings: "Réglages" },
  onboard: {
    welcome: "Bienvenue sur WeatherWise",
    subtitle:
      "Prévisions en direct, courbes heure par heure et un conseiller vestimentaire qui surveille le ciel pour vous — même application fermée.",
    useGps: "Utiliser ma position",
    pickCity: "Rechercher une ville",
    gpsHint:
      "WeatherWise utilise le GPS uniquement pour votre prévision locale. Votre position est stockée de façon sécurisée et n'est jamais partagée.",
    skip: "Plus tard",
    start: "Commencer",
  },
  home: {
    feelsLike: "Ressenti",
    humidity: "Humidité",
    wind: "Vent",
    precip: "Précipitations",
    uv: "Indice UV",
    visibility: "Visibilité",
    hourly: "Heure par heure",
    outfit: "Comment s'habiller",
    why: "Pourquoi cette tenue",
    today: "Tendance du jour",
    now: "Maintenant",
    updated: "Mis à jour",
    refresh: "Actualiser",
    high: "Max",
    low: "Min",
    swing: "d'amplitude",
  },
  conditions: {
    clear: "Ciel dégagé",
    mostlyClear: "Plutôt dégagé",
    partlyCloudy: "Partiellement nuageux",
    overcast: "Couvert",
    fog: "Brouillard",
    drizzle: "Bruine",
    lightRain: "Pluie légère",
    rain: "Pluie",
    heavyRain: "Forte pluie",
    freezingRain: "Pluie verglaçante",
    lightSnow: "Neige légère",
    snow: "Neige",
    heavySnow: "Forte neige",
    sleet: "Neige fondue",
    showers: "Averses",
    thunderstorm: "Orage",
  },
  clothes: {
    tshirt: "T-shirt",
    longSleeve: "Haut à manches longues",
    sweater: "Pull",
    fleece: "Polaire",
    lightJacket: "Veste légère",
    windbreaker: "Coupe-vent",
    coat: "Manteau chaud",
    raincoat: "Imperméable",
    thermal: "Sous-couche thermique",
    shorts: "Short",
    trousers: "Pantalon",
    warmTrousers: "Pantalon chaud",
    sneakers: "Baskets",
    boots: "Bottes",
    waterproofShoes: "Chaussures imperméables",
    umbrella: "Parapluie",
    sunglasses: "Lunettes de soleil",
    cap: "Casquette ou chapeau",
    beanie: "Bonnet",
    gloves: "Gants",
    scarf: "Écharpe",
    sunscreen: "Crème solaire",
    water: "Gourde d'eau",
  },
  reasons: {
    freezing: "Proche du gel ({t}°) — couvrez-vous bien.",
    cold: "Air froid ({t}°) — prévoyez de vraies couches.",
    chilly: "{t}° bien frais — une couche légère suffit.",
    mild: "{t}° agréables — tenue légère et souple.",
    warm: "{t}° doux — tissus respirants.",
    hot: "Chaleur à {t}° — restez frais et hydraté.",
    rainLikely: "Pluie probable ({p} %) — restez au sec.",
    rainPossible: "{p} % de risque de pluie — anticipez.",
    snowLikely: "Neige attendue — chaleur et adhérence.",
    windStrong: "Rafales proches de {w} — protégez-vous du vent.",
    uvHigh: "Indice UV {u} — protégez votre peau.",
    swingBig: "{d}° d'écart dans la journée — superposez les couches.",
  },
  cities: {
    title: "Vos villes",
    search: "Rechercher une ville, un village…",
    add: "Ajouter",
    current: "Position actuelle",
    primary: "Ville principale",
    setPrimary: "Définir principale",
    remove: "Supprimer",
    empty: "Aucune ville pour l'instant",
    emptyHint: "Ajoutez une ville ci-dessus ou utilisez votre position GPS.",
    noResults: "Aucun lieu ne correspond à votre recherche.",
  },
  settings: {
    title: "Réglages",
    language: "Langue",
    units: "Unités",
    metric: "Celsius · km/h",
    imperial: "Fahrenheit · mph",
    notifications: "Notifications",
    notifMaster: "Alertes météo",
    notifMasterHint: "Alertes push réelles de notre surveillant météo, même application fermée.",
    notifTemp: "Changements de température",
    notifTempHint: "Quand la prévision change assez pour changer de tenue.",
    notifRain: "Alertes pluie et neige",
    notifRainHint: "Quand la pluie apparaît ou disparaît des prévisions.",
    notifMorning: "Briefing du matin",
    notifMorningHint: "Un briefing tenue chaque matin.",
    morningAt: "Heure du briefing",
    locationSection: "Position",
    gpsStatus: "Autorisation GPS",
    gpsGranted: "Accordée — la prévision locale vous suit.",
    gpsDenied: "Refusée — ajoutez des villes manuellement dans l'onglet Villes.",
    gpsPrompt: "Pas encore décidée — WeatherWise demandera au bon moment.",
    privacy: "Confidentialité",
    clearData: "Supprimer mes données",
    clearDataHint: "Efface vos villes, préférences et l'enregistrement push de nos serveurs.",
    install: "Installer l'application",
    installHint:
      "Installez WeatherWise sur votre écran d'accueil pour l'expérience complète et les notifications.",
    installIOS: "Sur iPhone : Partager → Sur l'écran d'accueil.",
    installed: "Installée — fonctionne comme une app.",
    version: "WeatherWise 1.0 — intelligence météo",
    pushState: "État des notifications",
    pushOn: "Actives sur cet appareil",
    pushOff: "Inactives",
    pushBlocked: "Bloquées par le navigateur — activez-les dans les réglages système.",
    pushUnsupported: "Installez l'app pour recevoir les alertes push sur cet appareil.",
  },
  notify: {
    tempShiftTitle: "La météo a changé — revoyez votre tenue",
    tempShiftBody: "{place} : direction {t}° ({dir}). {tip}",
    rainShiftTitle: "La pluie arrive",
    rainShiftBody: "{place} : {p} % de précipitations aujourd'hui. {tip}",
    clearShiftBody: "{place} : le ciel se dégage. {tip}",
    morningTitle: "Votre briefing tenue du matin",
    morningBody: "{place} : {t}° maintenant, max {h}°. {tip}",
  },
  errors: {
    network: "Pas de connexion. Vérifiez votre réseau et réessayez.",
    weatherDown: "Le service météo est indisponible. Réessayez dans un instant.",
    locationDenied: "Position refusée. Vous pouvez toujours ajouter des villes à la main.",
    locationTimeout: "Position introuvable à temps. Réessayez ou choisissez une ville.",
    locationUnsupported: "Cet appareil ne gère pas la géolocalisation.",
    cityRequired: "Ajoutez d'abord une ville ou activez la position.",
    generic: "Un problème est survenu depuis la dernière mise à jour.",
  },
  common: {
    retry: "Réessayer",
    cancel: "Annuler",
    save: "Enregistrer",
    done: "OK",
    close: "Fermer",
    offline: "Hors ligne — dernière prévision synchronisée",
    online: "De nouveau en ligne",
  },
};

const ar: Dict = {
  app: { name: "ويذر وايز", tagline: "البس على قدّ السما فوقك" },
  nav: { home: "اليوم", cities: "المدن", settings: "الإعدادات" },
  onboard: {
    welcome: "مرحباً بك في ويذر وايز",
    subtitle:
      "توقعات مباشرة، منحنيات كل ساعة، ومستشار ملابس يراقب السماء من أجلك — حتى عندما يكون التطبيق مغلقاً.",
    useGps: "استخدم موقعي",
    pickCity: "ابحث عن مدينة",
    gpsHint:
      "يستخدم ويذر وايز نظام تحديد المواقع فقط لجلب توقعات منطقتك. موقعك محفوظ بأمان على خادمنا ولا تتم مشاركته أبداً.",
    skip: "ليس الآن",
    start: "ابدأ الآن",
  },
  home: {
    feelsLike: "الإحساس الفعلي",
    humidity: "الرطوبة",
    wind: "الرياح",
    precip: "الهطول",
    uv: "الأشعة فوق البنفسجية",
    visibility: "الرؤية",
    hourly: "ساعة بساعة",
    outfit: "ماذا تلبس",
    why: "لماذا هذه الملابس",
    today: "نظرة على اليوم",
    now: "الآن",
    updated: "آخر تحديث",
    refresh: "تحديث",
    high: "العظمى",
    low: "الصغرى",
    swing: "فارق حرارة",
  },
  conditions: {
    clear: "سماء صافية",
    mostlyClear: "صافية غالباً",
    partlyCloudy: "غائم جزئياً",
    overcast: "غائم كلياً",
    fog: "ضباب",
    drizzle: "رذاذ خفيف",
    lightRain: "مطر خفيف",
    rain: "مطر",
    heavyRain: "مطر غزير",
    freezingRain: "مطر متجمد",
    lightSnow: "ثلج خفيف",
    snow: "ثلج",
    heavySnow: "ثلج كثيف",
    sleet: "مطر ثلجي",
    showers: "زخات",
    thunderstorm: "عاصفة رعدية",
  },
  clothes: {
    tshirt: "قميص قطني",
    longSleeve: "قميص بأكمام طويلة",
    sweater: "سترة صوفية",
    fleece: "سترة قطنية سميكة",
    lightJacket: "سترة خفيفة",
    windbreaker: "سترة واقية من الرياح",
    coat: "معطف دافئ",
    raincoat: "معطف مطر",
    thermal: "طبقة أساسية حرارية",
    shorts: "سروال قصير",
    trousers: "سروال",
    warmTrousers: "سروال دافئ",
    sneakers: "حذاء رياضي",
    boots: "حذاء طويل",
    waterproofShoes: "حذاء مقاوم للماء",
    umbrella: "مظلة",
    sunglasses: "نظارات شمسية",
    cap: "قبعة",
    beanie: "قبعة صوف",
    gloves: "قفازات",
    scarf: "وشاح",
    sunscreen: "واقي شمسي",
    water: "قارورة ماء",
  },
  reasons: {
    freezing: "قريب من التجمد ({t}°) — البس طبقات دافئة جداً.",
    cold: "هواء بارد ({t}°) — تحتاج طبقات حقيقية.",
    chilly: "{t}° منعشة — طبقة خفيفة تكفي.",
    mild: "{t}° مريحة — ملابس خفيفة ومرنة.",
    warm: "دفء بحدود {t}° — أقمشة تسمح بالتهوية.",
    hot: "حرارة {t}° — حافظ على برودتك ورطوبتك.",
    rainLikely: "مطر محتمل بنسبة {p}% — ابقَ جافاً.",
    rainPossible: "احتمال مطر {p}% — خذ احتياطك.",
    snowLikely: "ثلوج متوقعة — الدفء والثبات أولاً.",
    windStrong: "هبات رياح قرب {w} — احتمِ من الرياح.",
    uvHigh: "مؤشر UV هو {u} — احمِ بشرتك.",
    swingBig: "فارق {d}° خلال اليوم — البس طبقات لتتأقلم.",
  },
  cities: {
    title: "مدنك",
    search: "ابحث عن مدينة أو قرية…",
    add: "إضافة",
    current: "الموقع الحالي",
    primary: "المدينة الرئيسية",
    setPrimary: "اجعلها رئيسية",
    remove: "حذف",
    empty: "لا توجد مدن بعد",
    emptyHint: "أضف مدينة أعلاه أو استخدم موقعك عبر GPS للبدء.",
    noResults: "لا توجد أماكن تطابق بحثك.",
  },
  settings: {
    title: "الإعدادات",
    language: "اللغة",
    units: "الوحدات",
    metric: "مئوية · كم/س",
    imperial: "فهرنهايت · ميل/س",
    notifications: "الإشعارات",
    notifMaster: "تنبيهات الطقس",
    notifMasterHint: "تنبيهات فورية حقيقية من مراقب الطقس لدينا، حتى والتطبيق مغلق.",
    notifTemp: "تحولات الحرارة",
    notifTempHint: "عندما تتغير التوقعات بما يكفي لتغيير ملابسك.",
    notifRain: "تنبيهات المطر والثلج",
    notifRainHint: "عندما يظهر المطر أو يختفي من التوقعات.",
    notifMorning: "موجز الصباح",
    notifMorningHint: "موجز ملابس واحد كل صباح.",
    morningAt: "وقت الموجز",
    locationSection: "الموقع",
    gpsStatus: "إذن تحديد الموقع",
    gpsGranted: "مُنح — التوقعات المحلية تتبعك.",
    gpsDenied: "مرفوض — أضف المدن يدوياً من تبويب المدن.",
    gpsPrompt: "لم يُحسم بعد — سيسألك ويذر وايز عند الحاجة.",
    privacy: "الخصوصية",
    clearData: "حذف بياناتي",
    clearDataHint: "يمحو مدنك وتفضيلاتك وتسجيل الإشعارات من خادمنا.",
    install: "تثبيت التطبيق",
    installHint: "ثبّت ويذر وايز على شاشتك الرئيسية لتجربة التطبيق الكاملة والإشعارات.",
    installIOS: "على آيفون: مشاركة ← إضافة إلى الشاشة الرئيسية.",
    installed: "مثبّت — يعمل كتطبيق مستقل.",
    version: "ويذر وايز 1.0 — ذكاء الطقس",
    pushState: "حالة الإشعارات",
    pushOn: "مفعّلة على هذا الجهاز",
    pushOff: "غير مفعّلة",
    pushBlocked: "محظورة من المتصفح — فعّلها من إعدادات النظام.",
    pushUnsupported: "ثبّت التطبيق أولاً لتصلك التنبيهات على هذا الجهاز.",
  },
  notify: {
    tempShiftTitle: "الطقس تغيّر — أعد التفكير في ملابسك",
    tempShiftBody: "{place}: الاتجاه نحو {t}° ({dir}). {tip}",
    rainShiftTitle: "المطر اقترب",
    rainShiftBody: "{place}: احتمال هطول {p}% اليوم. {tip}",
    clearShiftBody: "{place}: السماء صافية الآن. {tip}",
    morningTitle: "موجز ملابسك الصباحي",
    morningBody: "{place}: {t}° الآن، العظمى {h}°. {tip}",
  },
  errors: {
    network: "لا يوجد اتصال. تحقق من الشبكة وأعد المحاولة.",
    weatherDown: "خدمة الطقس غير متاحة حالياً. أعد المحاولة بعد قليل.",
    locationDenied: "تم رفض إذن الموقع. يمكنك إضافة المدن يدوياً.",
    locationTimeout: "تعذر تحديد موقعك في الوقت المناسب. حاول مجدداً أو اختر مدينة.",
    locationUnsupported: "هذا الجهاز لا يدعم تحديد الموقع.",
    cityRequired: "أضف مدينة أو فعّل الموقع أولاً.",
    generic: "حدث خطأ ما منذ آخر تحديث.",
  },
  common: {
    retry: "إعادة المحاولة",
    cancel: "إلغاء",
    save: "حفظ",
    done: "تم",
    close: "إغلاق",
    offline: "غير متصل — آخر توقعات متزامنة",
    online: "عاد الاتصال",
  },
};

export const dictionaries: Record<Locale, Dict> = { en, fr, ar };
