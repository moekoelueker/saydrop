import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  DARK_SCHEME_QUERY,
  THEME_OPTIONS,
  THEME_STORAGE_KEY,
  applyStoredTheme,
  getSystemPrefersDark,
  isThemePreference,
  loadThemePreference,
  resolveTheme,
  saveThemePreference,
  setThemePreference,
  startThemeSync,
  subscribeToSystemTheme,
  type ThemePreference,
} from "./theme";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    data,
  };
}

const brokenStorage = {
  getItem: () => {
    throw new Error("denied");
  },
  setItem: () => {
    throw new Error("denied");
  },
};

function fakeMatchMedia(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const matchMedia = vi.fn((query: string) => {
    expect(query).toBe(DARK_SCHEME_QUERY);
    return {
      get matches() {
        return dark;
      },
      addEventListener: (
        _: "change",
        listener: (event: { matches: boolean }) => void,
      ) => void listeners.add(listener),
      removeEventListener: (
        _: "change",
        listener: (event: { matches: boolean }) => void,
      ) => void listeners.delete(listener),
    };
  });
  return {
    matchMedia,
    listeners,
    setDark(next: boolean) {
      dark = next;
      listeners.forEach((listener) => listener({ matches: next }));
    },
  };
}

const fakeRoot = () => ({ dataset: {} as DOMStringMap });

describe("resolveTheme", () => {
  it("follows the OS for system and honours explicit choices", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("preference storage", () => {
  it("defaults to system when nothing or garbage is stored", () => {
    expect(loadThemePreference(memoryStorage())).toBe("system");
    expect(
      loadThemePreference(memoryStorage({ [THEME_STORAGE_KEY]: "sepia" })),
    ).toBe("system");
    expect(loadThemePreference(null)).toBe("system");
  });

  it("round-trips a saved preference", () => {
    const storage = memoryStorage();
    saveThemePreference("light", storage);
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe("light");
    expect(loadThemePreference(storage)).toBe("light");
  });

  it("survives storage that throws", () => {
    expect(loadThemePreference(brokenStorage)).toBe("system");
    expect(() => saveThemePreference("dark", brokenStorage)).not.toThrow();
  });

  it("only accepts the three known values", () => {
    expect(THEME_OPTIONS.map((option) => option.value)).toEqual([
      "system",
      "light",
      "dark",
    ]);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("auto")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });
});

describe("getSystemPrefersDark", () => {
  it("reads the media query and falls back to dark when unavailable", () => {
    expect(getSystemPrefersDark(fakeMatchMedia(false).matchMedia)).toBe(false);
    expect(getSystemPrefersDark(fakeMatchMedia(true).matchMedia)).toBe(true);
    expect(getSystemPrefersDark(null)).toBe(true);
  });
});

describe("applying the theme", () => {
  it("writes the resolved theme to the root element", () => {
    const root = fakeRoot();
    const media = fakeMatchMedia(false);
    applyStoredTheme({
      storage: memoryStorage(),
      matchMedia: media.matchMedia,
      root,
    });
    expect(root.dataset.theme).toBe("light");
  });

  it("setThemePreference saves and applies immediately", () => {
    const root = fakeRoot();
    const storage = memoryStorage();
    const media = fakeMatchMedia(false);
    expect(
      setThemePreference("dark", {
        storage,
        matchMedia: media.matchMedia,
        root,
      }),
    ).toBe("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(storage.data.get(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("setThemePreference still applies when storage is broken", () => {
    const root = fakeRoot();
    setThemePreference("light", {
      storage: brokenStorage,
      matchMedia: fakeMatchMedia(true).matchMedia,
      root,
    });
    expect(root.dataset.theme).toBe("light");
  });
});

describe("live OS changes", () => {
  it("subscribe notifies and unsubscribes", () => {
    const media = fakeMatchMedia(true);
    const onChange = vi.fn();
    const stop = subscribeToSystemTheme(onChange, media.matchMedia);
    media.setDark(false);
    expect(onChange).toHaveBeenCalledWith(false);
    stop();
    expect(media.listeners.size).toBe(0);
  });

  it("startThemeSync follows the OS only while the preference is system", () => {
    const root = fakeRoot();
    const storage = memoryStorage();
    const media = fakeMatchMedia(true);
    const stop = startThemeSync({
      storage,
      matchMedia: media.matchMedia,
      root,
    });
    expect(root.dataset.theme).toBe("dark");

    media.setDark(false);
    expect(root.dataset.theme).toBe("light");

    setThemePreference("dark", { storage, matchMedia: media.matchMedia, root });
    media.setDark(false);
    expect(root.dataset.theme).toBe("dark");

    setThemePreference("system", {
      storage,
      matchMedia: media.matchMedia,
      root,
    });
    expect(root.dataset.theme).toBe("light");
    media.setDark(true);
    expect(root.dataset.theme).toBe("dark");

    stop();
    expect(media.listeners.size).toBe(0);
  });
});

describe("index.html pre-paint script", () => {
  const html = readFileSync(
    path.resolve(__dirname, "../../index.html"),
    "utf8",
  );
  const script = html.match(
    /<script id="theme-init">([\s\S]*?)<\/script>/,
  )?.[1];

  function runInlineScript(options: {
    stored?: string | null;
    storageThrows?: boolean;
    prefersDark?: boolean;
    matchMediaMissing?: boolean;
  }) {
    const root = fakeRoot();
    const window = {
      localStorage: options.storageThrows
        ? brokenStorage
        : memoryStorage(
            options.stored == null
              ? {}
              : { [THEME_STORAGE_KEY]: options.stored },
          ),
      matchMedia: options.matchMediaMissing
        ? undefined
        : (query: string) => ({
            matches: query === DARK_SCHEME_QUERY && !!options.prefersDark,
          }),
    };
    new Function("window", "document", script!)(window, {
      documentElement: root,
    });
    return root.dataset.theme;
  }

  it("exists in the head", () => {
    expect(script).toBeTruthy();
    expect(html.indexOf("theme-init")).toBeLessThan(html.indexOf("</head>"));
  });

  it("matches resolveTheme for every stored value and OS setting", () => {
    const stored: Array<string | null> = [null, "system", "light", "dark", "x"];
    for (const value of stored) {
      for (const prefersDark of [true, false]) {
        const preference: ThemePreference = isThemePreference(value)
          ? value
          : "system";
        expect(runInlineScript({ stored: value, prefersDark })).toBe(
          resolveTheme(preference, prefersDark),
        );
      }
    }
  });

  it("falls back safely when storage or matchMedia are unavailable", () => {
    expect(runInlineScript({ storageThrows: true, prefersDark: false })).toBe(
      "light",
    );
    expect(runInlineScript({ stored: "light", matchMediaMissing: true })).toBe(
      "light",
    );
    expect(runInlineScript({ matchMediaMissing: true })).toBe("dark");
  });
});
