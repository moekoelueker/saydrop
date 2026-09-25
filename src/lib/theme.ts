/**
 * Appearance (theme) preference: System, Light or Dark.
 *
 * The resolved theme is always written to <html data-theme="light|dark">, so
 * CSS only needs `:root[data-theme="light"]` overrides. "System" resolves via
 * the prefers-color-scheme media query and follows live OS changes.
 *
 * The inline script in index.html repeats the startup part of this logic
 * (storage key, valid values, dark fallback) so the right theme is set before
 * the first paint. theme.test.ts runs that script to keep both in sync.
 */

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "gladiaflow.theme";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
export const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

export const THEME_OPTIONS: ReadonlyArray<{
  value: ThemePreference;
  label: string;
}> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type MatchMediaLike = (query: string) => {
  matches: boolean;
  addEventListener?: (
    type: "change",
    listener: (event: { matches: boolean }) => void,
  ) => void;
  removeEventListener?: (
    type: "change",
    listener: (event: { matches: boolean }) => void,
  ) => void;
  /** Legacy Safari (< 14) MediaQueryList API. */
  addListener?: (listener: (event: { matches: boolean }) => void) => void;
  removeListener?: (listener: (event: { matches: boolean }) => void) => void;
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function defaultMatchMedia(): MatchMediaLike | null {
  if (typeof window === "undefined" || !window.matchMedia) return null;
  return (query) => window.matchMedia(query);
}

export function loadThemePreference(
  storage: StorageLike | null = defaultStorage(),
): ThemePreference {
  try {
    const stored = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export function saveThemePreference(
  preference: ThemePreference,
  storage: StorageLike | null = defaultStorage(),
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage can be unavailable (private mode, quota). The choice still
    // applies for this session.
  }
}

/** Unknown system appearance falls back to dark, the app's original look. */
export function getSystemPrefersDark(
  matchMedia: MatchMediaLike | null = defaultMatchMedia(),
): boolean {
  try {
    return matchMedia ? matchMedia(DARK_SCHEME_QUERY).matches : true;
  } catch {
    return true;
  }
}

export function applyTheme(
  theme: ResolvedTheme,
  root: { dataset: DOMStringMap } = document.documentElement,
): void {
  root.dataset.theme = theme;
}

/** Calls `onChange` whenever the OS appearance changes. Returns unsubscribe. */
export function subscribeToSystemTheme(
  onChange: (prefersDark: boolean) => void,
  matchMedia: MatchMediaLike | null = defaultMatchMedia(),
): () => void {
  if (!matchMedia) return () => {};
  let query: ReturnType<MatchMediaLike>;
  try {
    query = matchMedia(DARK_SCHEME_QUERY);
  } catch {
    return () => {};
  }
  const listener = (event: { matches: boolean }) => onChange(event.matches);
  if (query.addEventListener) {
    query.addEventListener("change", listener);
    return () => query.removeEventListener?.("change", listener);
  }
  if (query.addListener) {
    query.addListener(listener);
    return () => query.removeListener?.(listener);
  }
  return () => {};
}

/** Resolves the stored preference against the current OS appearance. */
export function applyStoredTheme(
  deps: {
    storage?: StorageLike | null;
    matchMedia?: MatchMediaLike | null;
    root?: { dataset: DOMStringMap };
  } = {},
): ResolvedTheme {
  const storage = deps.storage === undefined ? defaultStorage() : deps.storage;
  const matchMedia =
    deps.matchMedia === undefined ? defaultMatchMedia() : deps.matchMedia;
  const theme = resolveTheme(
    loadThemePreference(storage),
    getSystemPrefersDark(matchMedia),
  );
  applyTheme(theme, deps.root);
  return theme;
}

/**
 * Applies the stored theme and keeps it in sync with the OS while the app
 * runs. The preference is re-read on every OS change, so a choice made in
 * settings is always respected. Returns a stop function.
 */
export function startThemeSync(
  deps: {
    storage?: StorageLike | null;
    matchMedia?: MatchMediaLike | null;
    root?: { dataset: DOMStringMap };
  } = {},
): () => void {
  applyStoredTheme(deps);
  const storage = deps.storage === undefined ? defaultStorage() : deps.storage;
  const matchMedia =
    deps.matchMedia === undefined ? defaultMatchMedia() : deps.matchMedia;
  return subscribeToSystemTheme((prefersDark) => {
    const preference = loadThemePreference(storage);
    if (preference === "system") {
      applyTheme(resolveTheme(preference, prefersDark), deps.root);
    }
  }, matchMedia);
}

/** Saves a new preference and applies it immediately. */
export function setThemePreference(
  preference: ThemePreference,
  deps: {
    storage?: StorageLike | null;
    matchMedia?: MatchMediaLike | null;
    root?: { dataset: DOMStringMap };
  } = {},
): ResolvedTheme {
  const storage = deps.storage === undefined ? defaultStorage() : deps.storage;
  const matchMedia =
    deps.matchMedia === undefined ? defaultMatchMedia() : deps.matchMedia;
  saveThemePreference(preference, storage);
  const theme = resolveTheme(preference, getSystemPrefersDark(matchMedia));
  applyTheme(theme, deps.root);
  return theme;
}
