import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type LocalePreference = Readonly<{
  language: string;
  region: string | null;
}>;

const STORAGE_KEY = "global-locale-kit.preference.v1";
const DEFAULT_LOCALE: LocalePreference = { language: "en", region: null };

// This is a language choice registry, not a claim that every product has
// translated product copy in every language. A product may only advertise a
// locale as fully available after publishing its approved message pack.
export const GLOBAL_LANGUAGE_CODES = [
  "af", "am", "ar", "as", "az", "be", "bg", "bn", "bs", "ca", "cs", "cy",
  "da", "de", "el", "en", "es", "et", "eu", "fa", "fi", "fil", "fr", "ga",
  "gl", "gu", "he", "hi", "hr", "hu", "hy", "id", "ig", "is", "it", "ja",
  "ka", "kk", "km", "kn", "ko", "ku", "ky", "lo", "lt", "lv", "mk", "ml",
  "mn", "mr", "ms", "mt", "my", "ne", "nl", "no", "or", "pa", "pl", "ps",
  "pt", "ro", "ru", "rw", "si", "sk", "sl", "so", "sq", "sr", "sv", "sw",
  "ta", "te", "tg", "th", "ti", "tk", "tr", "uk", "ur", "uz", "vi", "xh",
  "yo", "zh", "zu",
] as const;

const RTL_LANGUAGES = new Set(["ar", "fa", "he", "ps", "sd", "ug", "ur"]);

const REGIONS = [
  "AU", "BR", "CA", "CN", "DE", "EG", "ES", "FR", "GB", "ID", "IN", "JP",
  "KR", "MX", "NG", "PK", "SA", "US", "ZA",
] as const;

function canonicalLanguage(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return Intl.getCanonicalLocales(value.trim())[0] ?? null;
  } catch {
    return null;
  }
}

function isRegion(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{2}$/.test(value);
}

function normalizePreference(value: unknown): LocalePreference {
  const candidate = value as Partial<LocalePreference> | null;
  const language = canonicalLanguage(candidate?.language);
  return {
    language: language && GLOBAL_LANGUAGE_CODES.includes(language as (typeof GLOBAL_LANGUAGE_CODES)[number])
      ? language
      : DEFAULT_LOCALE.language,
    region: isRegion(candidate?.region) ? candidate.region : null,
  };
}

function directionOf(language: string) {
  return RTL_LANGUAGES.has(language.split("-")[0]) ? "rtl" : "ltr";
}

function effectiveLocale(preference: LocalePreference) {
  if (!preference.region) return preference.language;
  try {
    return new Intl.Locale(preference.language, { region: preference.region }).toString();
  } catch {
    return preference.language;
  }
}

type LocaleContextValue = {
  preference: LocalePreference;
  locale: string;
  dir: "ltr" | "rtl";
  setPreference(preference: LocalePreference): void;
  format: {
    date(value: Date | number | string, options?: Intl.DateTimeFormatOptions): string;
    number(value: number, options?: Intl.NumberFormatOptions): string;
    currency(value: number, currency: string, options?: Intl.NumberFormatOptions): string;
  };
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleGate.");
  return value;
}

export function LocaleGate({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference | null>(null);

  useEffect(() => {
    try {
      setPreferenceState(normalizePreference(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")));
    } catch {
      setPreferenceState(DEFAULT_LOCALE);
    }
  }, []);

  const setPreference = (next: LocalePreference) => {
    const normalized = normalizePreference(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    setPreferenceState(normalized);
  };

  const active = preference ?? DEFAULT_LOCALE;
  const locale = effectiveLocale(active);
  const dir = directionOf(active.language);

  useEffect(() => {
    if (!preference) return;
    document.documentElement.lang = active.language;
    document.documentElement.dir = dir;
  }, [active.language, dir, preference]);

  const value = useMemo<LocaleContextValue>(() => ({
    preference: active,
    locale,
    dir,
    setPreference,
    format: {
      date: (date, options) => new Intl.DateTimeFormat(locale, options).format(new Date(date)),
      number: (number, options) => new Intl.NumberFormat(locale, options).format(number),
      currency: (number, currency, options) => new Intl.NumberFormat(locale, { style: "currency", currency, ...options }).format(number),
    },
  }), [active.language, active.region, dir, locale]);

  if (!preference) return null;

  return (
    <LocaleContext.Provider value={value}>
      <LocaleSetupDialog />
      {children}
    </LocaleContext.Provider>
  );
}

export function LocaleSettings() {
  const { preference, setPreference } = useLocale();
  return <LocaleFields preference={preference} onSave={setPreference} heading="Language and region" />;
}

function LocaleSetupDialog() {
  const { preference, setPreference } = useLocale();
  const [complete, setComplete] = useState(() => localStorage.getItem(STORAGE_KEY) !== null);

  if (complete) return null;

  return (
    <div className="global-locale-overlay" role="dialog" aria-modal="true" aria-labelledby="global-locale-title">
      <LocaleFields
        preference={preference}
        onSave={(next) => {
          setPreference(next);
          setComplete(true);
        }}
        heading="Choose your language and region"
      />
    </div>
  );
}

function LocaleFields({
  preference,
  onSave,
  heading,
}: {
  preference: LocalePreference;
  onSave(preference: LocalePreference): void;
  heading: string;
}) {
  const [language, setLanguage] = useState(preference.language);
  const [region, setRegion] = useState(preference.region ?? "");
  const languageNames = useMemo(() => new Intl.DisplayNames([language], { type: "language" }), [language]);
  const regionNames = useMemo(() => new Intl.DisplayNames([language], { type: "region" }), [language]);

  return (
    <form
      className="global-locale-card"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ language, region: region || null });
      }}
    >
      <h1 id="global-locale-title">{heading}</h1>
      <p>Choose how this product formats language, dates, numbers, and regional settings. You can change this later.</p>
      <label htmlFor="global-language">Language</label>
      <select id="global-language" value={language} onChange={(event) => setLanguage(event.target.value)}>
        {GLOBAL_LANGUAGE_CODES.map((code) => (
          <option key={code} value={code} dir={directionOf(code)}>
            {new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code} ({languageNames.of(code) ?? code})
          </option>
        ))}
      </select>
      <label htmlFor="global-region">Country or region <span>(optional)</span></label>
      <select id="global-region" value={region} onChange={(event) => setRegion(event.target.value)}>
        <option value="">No region selected</option>
        {REGIONS.map((code) => <option key={code} value={code}>{regionNames.of(code) ?? code}</option>)}
      </select>
      <button type="submit">Continue</button>
    </form>
  );
}
