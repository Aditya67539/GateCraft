import { state } from "../state.js";

// ─────────────────────────────────────────────────────────────────
// Signal state colors (5-state: high / low / z / x / e)
// ─────────────────────────────────────────────────────────────────
const DEFAULT_SIGNAL_COLORS = {
  dark: Object.freeze({
    high: "#00e676", // High (1) - Radiant Green
    low:  "#003d1e", // Low (0)  - low-brightness relative green
    z:    "#f59e0b", // High-Z   - Slate Gray
    x:    "#94a3b8", // Unknown  - Vibrant Purple
    e:    "#e11d48", // Error    - Striking Crimson Red
  }),
  light: Object.freeze({
    high: "#0d7a3e", // High (1) - Forest Green (contrast on light bg)
    low:  "#94a3b8", // Low (0)  - Slate Gray
    z:    "#f59e0b", // High-Z   - Muted Slate
    x:    "#64748b", // Unknown  - Violet
    e:    "#b91c1c", // Error    - Deep Red
  }),
};

export const SIGNAL_STATE_LABELS = {
  high: "High (1)",
  low:  "Low (0)",
  z:    "High-Z (Z)",
  x:    "Unknown (X)",
  e:    "Error (E)",
};

const SIGNAL_STORAGE_KEY = "gatecraft-signal-colors";

/** Loads any user overrides (partial map, may be empty). */
function loadSignalOverrides() {
  try {
    const raw = localStorage.getItem(SIGNAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore corrupt data */ }
  return {};
}

function saveSignalOverrides() {
  localStorage.setItem(SIGNAL_STORAGE_KEY, JSON.stringify(_signalOverrides));
}

let _signalOverrides = loadSignalOverrides();

/** Merges a theme's default signal colors with any user overrides. */
function signalColorsForTheme(themeId) {
  return { ...DEFAULT_SIGNAL_COLORS[themeId], ..._signalOverrides };
}

/** { high: "#fff", ... } → { high: { hex: "#fff" }, ... } */
function toColorObjMap(hexMap) {
  const out = {};
  for (const key in hexMap) out[key] = { hex: hexMap[key] };
  return out;
}

// ─────────────────────────────────────────────────────────────────
// Palettes
// ─────────────────────────────────────────────────────────────────
const darkPalette = {
  base:    { hex: "#1c1c1f" }, // canvas background
  mantle:  { hex: "#28282c" }, // grid
  logic:   { 
    hex: "#2A2A33", 
    gradientTop: "#32323a", 
    gradientBottom: "#25252E",
    stroke: "#3f3f46",       // subtle — gradient already defines the shape
  },
  panel:   { hex: "#141416" },
  surface: { hex: "#222226" },
  accent:  { hex: "#3b82f6" },
  ghost:   { hex: "#3f3f46" },
};

const lightPalette = {
  base:    { hex: "#eceef2" },
  mantle:  { hex: "#dde1e8" },
  logic:   { 
    hex: "#ffffff", 
    gradientTop: "#ffffff", 
    gradientBottom: "#eef0f4",
    stroke: "#c3c8d1",       // load-bearing — defines the edge against base
  },
  panel:   { hex: "#f8f9fb" },
  surface: { hex: "#e2e5ea" },
  accent:  { hex: "#2563eb" },
  ghost:   { hex: "#a8adb8" },
};

// ─────────────────────────────────────────────────────────────────
// Theme builders — functions (not static objects) so a fresh signal
// override always gets picked up when a theme is requested.
// ─────────────────────────────────────────────────────────────────
function buildDarkTheme() {
  const signals = toColorObjMap(signalColorsForTheme("dark"));
  return {
    canvas: { bg: darkPalette.base, grid: darkPalette.mantle },
    gates: {
      logic:  darkPalette.logic,
      input:  { ...signals },
      output: { ...signals },
    },
    wires: { ...signals, ghost: darkPalette.ghost },
    panel:   { bg: darkPalette.panel },
    surface: { bg: darkPalette.surface },
    accent:  darkPalette.accent,
    danger:  { hex: signals.e.hex },
    text: {
      primary: { hex: "#f4f4f5" },
      muted:   { hex: "#a1a1aa" },
      inverse: { hex: "#1c1c1f" },
    },
    font: {
      family: "'Inter', system-ui, sans-serif",
      google: "Inter:wght@400;500;600;700",
    },
    ui: {
      border:       { hex: "#ffffff", alpha: 0.08 },
      borderHover:  { hex: "#ffffff", alpha: 0.18 },
      overlay:      { hex: "#ffffff", alpha: 0.04 },
      overlayHover: { hex: "#ffffff", alpha: 0.08 },
    },
  };
}

function buildLightTheme() {
  const signals = toColorObjMap(signalColorsForTheme("light"));
  return {
    canvas: { bg: lightPalette.base, grid: lightPalette.mantle },
    gates: {
      logic:  lightPalette.logic,
      input:  { ...signals },
      output: { ...signals },
    },
    wires: { ...signals, ghost: lightPalette.ghost },
    panel:   { bg: lightPalette.panel },
    surface: { bg: lightPalette.surface },
    accent:  lightPalette.accent,
    danger:  { hex: signals.e.hex },
    text: {
      primary: { hex: "#18181b" },
      muted:   { hex: "#52525b" },
      inverse: { hex: "#f4f4f5" },
    },
    font: {
      family: "'Inter', system-ui, sans-serif",
      google: "Inter:wght@400;500;600;700",
    },
    ui: {
      border:       { hex: "#18181b", alpha: 0.10 },
      borderHover:  { hex: "#18181b", alpha: 0.20 },
      overlay:      { hex: "#18181b", alpha: 0.04 },
      overlayHover: { hex: "#18181b", alpha: 0.08 },
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Theme registry
// ─────────────────────────────────────────────────────────────────
export const themes = {
  dark:  { label: "Dark",  get theme() { return buildDarkTheme(); } },
  light: { label: "Light", get theme() { return buildLightTheme(); } },
};

const THEME_STORAGE_KEY = "gatecraft-theme";
let _activeThemeId = localStorage.getItem(THEME_STORAGE_KEY) || "dark";
if (!themes[_activeThemeId]) _activeThemeId = "dark";

export function getActiveTheme() {
  return themes[_activeThemeId].theme;
}

export function getActiveThemeId() {
  return _activeThemeId;
}

export function setActiveThemeId(id) {
  if (!themes[id]) return;
  _activeThemeId = id;
  localStorage.setItem(THEME_STORAGE_KEY, id);
  applyTheme(getActiveTheme());
}

// ─────────────────────────────────────────────────────────────────
// Signal color overrides
// ─────────────────────────────────────────────────────────────────
export function setSignalColor(key, hex) {
  if (!SIGNAL_STATE_LABELS[key]) return;

  _signalOverrides[key] = hex;
  saveSignalOverrides();

  state.gridDirty = true;
  applyTheme(getActiveTheme());
}

export function getSignalColors() {
  return signalColorsForTheme(_activeThemeId);
}

export function getDefaultSignalColors() {
  return DEFAULT_SIGNAL_COLORS[_activeThemeId];
}

export function resetSignalColors() {
  _signalOverrides = {};
  saveSignalOverrides();
  state.gridDirty = true;
  applyTheme(getActiveTheme());
}

// ─────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────
function hexToRGB(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(hex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return { r, g, b };
}

export function applyTheme(theme) {
  const root = document.documentElement;

  state.gridDirty = true;

  function flatten(obj, prefix = "theme") {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const val = obj[key];
        const newPrefix = prefix ? `${prefix}-${key}` : key;

        // Skip non-CSS properties
        if (key === "family" || key === "google") continue;

        if (val && typeof val.hex === "string") {
          // Inject hex
          root.style.setProperty(`--${newPrefix}`, val.hex);
          // Inject rgb components for rgba() usage
          const { r, g, b } = hexToRGB(val.hex);
          root.style.setProperty(`--${newPrefix}-rgb`, `${r}, ${g}, ${b}`);
          // Inject alpha if present (for ui border/overlay)
          if (typeof val.alpha === "number") {
            root.style.setProperty(`--${newPrefix}-alpha`, val.alpha);
          }
        } else if (typeof val === "object") {
          flatten(val, newPrefix);
        }
      }
    }
  }

  flatten(theme);

  // Apply font family
  if (theme.font) {
    root.style.setProperty("--theme-font-family", theme.font.family);

    // Dynamically load the Google Font
    const fontId = "theme-google-font";
    let link = document.getElementById(fontId);
    if (!link) {
      link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = `https://fonts.googleapis.com/css2?family=${theme.font.google}&display=swap`;
  }
}

/**
 * Call once at startup (e.g. in main.js) to paint the persisted theme
 * before the first render.
 */
export function initTheme() {
  applyTheme(getActiveTheme());
}