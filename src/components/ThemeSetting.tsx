import { useEffect, useRef, useState } from "react";
import {
  THEME_OPTIONS,
  loadThemePreference,
  setThemePreference,
  type ThemePreference,
} from "../lib/theme";

/** Current theme preference plus a setter that saves and applies it. */
export function useThemePreference(): [
  ThemePreference,
  (preference: ThemePreference) => void,
] {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    loadThemePreference(),
  );
  const update = (next: ThemePreference) => {
    setPreference(next);
    setThemePreference(next);
  };
  return [preference, update];
}

/**
 * Self-contained "Theme" setting (System / Light / Dark). Uses the same
 * dropdown markup and classes as the other settings dropdowns.
 */
export function ThemeSetting() {
  const [preference, setPreference] = useThemePreference();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectedLabel =
    THEME_OPTIONS.find((option) => option.value === preference)?.label ??
    "System";

  return (
    <div className="form-group">
      <label className="form-label" id="theme-setting-label">
        Theme
      </label>
      <div className={`multi-select ${open ? "open" : ""}`} ref={ref}>
        <button
          type="button"
          className="form-input multi-select-trigger"
          onClick={() => setOpen(!open)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby="theme-setting-label theme-setting-value"
        >
          <span id="theme-setting-value">{selectedLabel}</span>
        </button>
        {open && (
          <div className="multi-select-dropdown">
            <div
              className="multi-select-options"
              role="listbox"
              aria-labelledby="theme-setting-label"
            >
              {THEME_OPTIONS.map((option) => {
                const selected = preference === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`dropdown-option ${selected ? "selected" : ""}`}
                    onClick={() => {
                      setPreference(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
