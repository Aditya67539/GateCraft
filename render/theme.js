import { state } from "../state.js";

// ── Forge Palette & Theme ──────────────────────────────────────
const forgePalette = {
  void:     { hex: "#141417" },
  pitch:    { hex: "#1e1e24" },
  indigo:   { hex: "#2d2250" },
  forest:   { hex: "#1a7a58" },
  brick:    { hex: "#6b2828" },
  emerald:  { hex: "#26a96e" },
  rust:     { hex: "#8b3535" },
  coal:     { hex: "#1c1c21" },
  graphite: { hex: "#252529" },
  slate:    { hex: "#64748b" },
}

const forgeTheme = {
  canvas: {
    bg:     forgePalette.void,
    grid:   forgePalette.pitch,
  },
  gates: {
    logic:  forgePalette.indigo,
    input:  {
      high: forgePalette.forest,
      low:  forgePalette.brick,
    },
    output: {
      high: forgePalette.forest,
      low:  forgePalette.brick,
    }
  },
  wires: {
    high:   forgePalette.forest,
    low:    forgePalette.brick,
    ghost:  forgePalette.slate,
  },
  panel: {
    bg:     forgePalette.coal,
  },
  surface: {
    bg:     forgePalette.graphite,
  },
  accent:   forgePalette.emerald,
  danger:   forgePalette.rust,
  text: {
    primary: { hex: "#f8fafc" },
    muted:   { hex: "#94a3b8" },
    inverse: { hex: "#141417" },
  },
  font: {
    family: "'Inter', system-ui, sans-serif",
    google: "Inter:wght@400;500;600;700",
  },
  ui: {
    border:       { hex: "#ffffff", alpha: 0.10 },
    borderHover:  { hex: "#ffffff", alpha: 0.22 },
    overlay:      { hex: "#ffffff", alpha: 0.05 },
    overlayHover: { hex: "#ffffff", alpha: 0.10 },
  },
}

// ── Neon Palette & Theme ───────────────────────────────────────
const neonPalette = {
  abyss:    { hex: "#0a0a0f" },
  inkwell:  { hex: "#14141c" },
  midnight: { hex: "#1f1f3a" },
  cyan:     { hex: "#00f5ff" },
  pink:     { hex: "#ff006e" },
  dusk:     { hex: "#5e5e7a" },
  obsidian: { hex: "#12121a" },
  charcoal: { hex: "#1a1a26" },
  violet:   { hex: "#9d4edd" },
}

const neonTheme = {
  canvas: {
    bg:     neonPalette.abyss,
    grid:   neonPalette.inkwell,
  },
  gates: {
    logic:  neonPalette.midnight,
    input:  {
      high: neonPalette.cyan,
      low:  neonPalette.pink,
    },
    output: {
      high: neonPalette.cyan,
      low:  neonPalette.pink,
    }
  },
  wires: {
    high:   neonPalette.cyan,
    low:    neonPalette.pink,
    ghost:  neonPalette.dusk,
  },
  panel: { bg: neonPalette.obsidian },
  surface: { bg: neonPalette.charcoal },
  accent: neonPalette.violet,
  danger: neonPalette.pink,
  text: {
    primary: { hex: "#e0e7ff" },
    muted:   { hex: "#7c7ca0" },
    inverse: { hex: "#0a0a0f" },
  },
  font: {
    family: "'Orbitron', 'Inter', sans-serif",
    google: "Orbitron:wght@400;500;600;700",
  },
  ui: {
    border:       { hex: "#ffffff", alpha: 0.10 },
    borderHover:  { hex: "#ffffff", alpha: 0.22 },
    overlay:      { hex: "#ffffff", alpha: 0.05 },
    overlayHover: { hex: "#ffffff", alpha: 0.10 },
  },
}

// ── Terminal Palette & Theme ───────────────────────────────────
const terminalPalette = {
  black:    { hex: "#000000" },
  soot:     { hex: "#0a0a0a" },
  matrix:   { hex: "#001a00" },
  lime:     { hex: "#00ff88" },
  moss:     { hex: "#003322" },
  dim:      { hex: "#004d33" },
  ash:      { hex: "#1a1a1a" },
  jet:      { hex: "#050505" },
  onyx:     { hex: "#0d0d0d" },
  scarlet:  { hex: "#ff5555" },
}

const terminalTheme = {
  canvas: {
    bg:     terminalPalette.black,
    grid:   terminalPalette.soot,
  },
  gates: {
    logic:  terminalPalette.matrix,
    input:  {
      high: terminalPalette.lime,
      low:  terminalPalette.moss,
    },
    output: {
      high: terminalPalette.lime,
      low:  terminalPalette.moss,
    }
  },
  wires: {
    high:   terminalPalette.lime,
    low:    terminalPalette.dim,
    ghost:  terminalPalette.ash,
  },
  panel: { bg: terminalPalette.jet },
  surface: { bg: terminalPalette.onyx },
  accent: terminalPalette.lime,
  danger: terminalPalette.scarlet,
  text: {
    primary: { hex: "#00ff88" },
    muted:   { hex: "#2a7a50" },
    inverse: { hex: "#000000" },
  },
  font: {
    family: "'Fira Code', 'Courier New', monospace",
    google: "Fira+Code:wght@400;500;600;700",
  },
  ui: {
    border:       { hex: "#00ff88", alpha: 0.12 },
    borderHover:  { hex: "#00ff88", alpha: 0.28 },
    overlay:      { hex: "#00ff88", alpha: 0.04 },
    overlayHover: { hex: "#00ff88", alpha: 0.08 },
  },
}

// ── Molten Palette & Theme ─────────────────────────────────────
const moltenPalette = {
  ember:    { hex: "#1a0f0f" },
  smolder:  { hex: "#2a1a1a" },
  magma:    { hex: "#3b1f1f" },
  flame:    { hex: "#ff6b00" },
  cinder:   { hex: "#5a1a1a" },
  crimson:  { hex: "#7f1d1d" },
  haze:     { hex: "#6b4f4f" },
  charcoal: { hex: "#140a0a" },
  soot:     { hex: "#241212" },
  amber:    { hex: "#ff8c42" },
  scarlet:  { hex: "#ff3b3b" },
}

const moltenTheme = {
  canvas: {
    bg:     moltenPalette.ember,
    grid:   moltenPalette.smolder,
  },
  gates: {
    logic:  moltenPalette.magma,
    input:  {
      high: moltenPalette.flame,
      low:  moltenPalette.cinder,
    },
    output: {
      high: moltenPalette.flame,
      low:  moltenPalette.cinder,
    }
  },
  wires: {
    high:   moltenPalette.flame,
    low:    moltenPalette.crimson,
    ghost:  moltenPalette.haze,
  },
  panel: { bg: moltenPalette.charcoal },
  surface: { bg: moltenPalette.soot },
  accent: moltenPalette.amber,
  danger: moltenPalette.scarlet,
  text: {
    primary: { hex: "#fde8d0" },
    muted:   { hex: "#8b6b5b" },
    inverse: { hex: "#1a0f0f" },
  },
  font: {
    family: "'Rajdhani', 'Inter', sans-serif",
    google: "Rajdhani:wght@400;500;600;700",
  },
  ui: {
    border:       { hex: "#ffffff", alpha: 0.08 },
    borderHover:  { hex: "#ff8c42", alpha: 0.30 },
    overlay:      { hex: "#ff6b00", alpha: 0.04 },
    overlayHover: { hex: "#ff6b00", alpha: 0.10 },
  },
}

// ── Ocean Palette & Theme ──────────────────────────────────────
const oceanPalette = {
  deep:     { hex: "#0b1220" },
  abyss:    { hex: "#121a2b" },
  navy:     { hex: "#1e3a5f" },
  sky:      { hex: "#38bdf8" },
  slate:    { hex: "#1e293b" },
  storm:    { hex: "#334155" },
  mist:     { hex: "#64748b" },
  midnight: { hex: "#0f172a" },
  dusk:     { hex: "#1e293b" },
  azure:    { hex: "#0ea5e9" },
  coral:    { hex: "#ef4444" },
}

const oceanTheme = {
  canvas: {
    bg:     oceanPalette.deep,
    grid:   oceanPalette.abyss,
  },
  gates: {
    logic:  oceanPalette.navy,
    input:  {
      high: oceanPalette.sky,
      low:  oceanPalette.slate,
    },
    output: {
      high: oceanPalette.sky,
      low:  oceanPalette.slate,
    }
  },
  wires: {
    high:   oceanPalette.sky,
    low:    oceanPalette.storm,
    ghost:  oceanPalette.mist,
  },
  panel: { bg: oceanPalette.midnight },
  surface: { bg: oceanPalette.dusk },
  accent: oceanPalette.azure,
  danger: oceanPalette.coral,
  text: {
    primary: { hex: "#e2e8f0" },
    muted:   { hex: "#64748b" },
    inverse: { hex: "#0b1220" },
  },
  font: {
    family: "'Inter', system-ui, sans-serif",
    google: "Inter:wght@400;500;600;700",
  },
  ui: {
    border:       { hex: "#ffffff", alpha: 0.10 },
    borderHover:  { hex: "#ffffff", alpha: 0.22 },
    overlay:      { hex: "#ffffff", alpha: 0.05 },
    overlayHover: { hex: "#ffffff", alpha: 0.10 },
  },
}

// ── Voltage Palette & Theme ────────────────────────────────────
const voltagePalette = {
  void:     { hex: "#0f111a" },
  electric: { hex: "#ffff00" },
  plasma:   { hex: "#7000ff" },
  storm:    { hex: "#1a1b26" },
  dead:     { hex: "#444444" },
  spark:    { hex: "#00ffcc" },
  hot:      { hex: "#ff0055" },
}

const voltageTheme = {
  canvas: {
    bg:     voltagePalette.void,
    grid:   voltagePalette.storm,
  },
  gates: {
    logic:  voltagePalette.plasma,
    input:  {
      high: voltagePalette.electric,
      low:  voltagePalette.dead,
    },
    output: {
      high: voltagePalette.electric,
      low:  voltagePalette.dead,
    }
  },
  wires: {
    high:   voltagePalette.electric,
    low:    voltagePalette.dead,
    ghost:  voltagePalette.storm,
  },
  panel: { bg: { hex: "#16161e" } },
  surface: { bg: { hex: "#1a1b26" } },
  accent: voltagePalette.spark,
  danger: voltagePalette.hot,
  text: {
    primary: { hex: "#f0f0ff" },
    muted:   { hex: "#6b6b8a" },
    inverse: { hex: "#0f111a" },
  },
  font: {
    family: "'Share Tech Mono', 'Courier New', monospace",
    google: "Share+Tech+Mono",
  },
  ui: {
    border:       { hex: "#ffffff", alpha: 0.10 },
    borderHover:  { hex: "#ffff00", alpha: 0.25 },
    overlay:      { hex: "#ffff00", alpha: 0.03 },
    overlayHover: { hex: "#ffff00", alpha: 0.08 },
  },
}

// ── Retro Grade Palette & Theme ────────────────────────────────
const retroPalette = {
  cream:    { hex: "#fbf1c7" },
  clay:     { hex: "#ebdbb2" },
  rust:     { hex: "#9d0006" },
  moss:     { hex: "#427b58" },
  faded:    { hex: "#928374" },
  wood:     { hex: "#3c3836" },
  blood:    { hex: "#9d0006" },
}

const retroTheme = {
  canvas: {
    bg:     retroPalette.cream,
    grid:   retroPalette.clay,
  },
  gates: {
    logic:  retroPalette.wood,
    input:  {
      high: retroPalette.moss,
      low:  retroPalette.rust,
    },
    output: {
      high: retroPalette.moss,
      low:  retroPalette.rust,
    }
  },
  wires: {
    high:   retroPalette.moss,
    low:    retroPalette.rust,
    ghost:  retroPalette.faded,
  },
  panel: { bg: retroPalette.clay },
  surface: { bg: retroPalette.cream },
  accent: retroPalette.wood,
  danger: retroPalette.blood,
  text: {
    primary: { hex: "#3c3836" },
    muted:   { hex: "#7c6f64" },
    inverse: { hex: "#fbf1c7" },
  },
  font: {
    family: "'Bitter', 'Georgia', serif",
    google: "Bitter:wght@400;500;600;700",
  },
  ui: {
    border:       { hex: "#3c3836", alpha: 0.15 },
    borderHover:  { hex: "#3c3836", alpha: 0.30 },
    overlay:      { hex: "#3c3836", alpha: 0.06 },
    overlayHover: { hex: "#3c3836", alpha: 0.12 },
  },
}


// ── Blueprint Palette & Theme ────────────────────────────────
const blueprintPalette = {
  base:      { hex: "#dce8f5" }, // canvas background
  mantle:    { hex: "#c5d8ef" }, // grid
  surface:   { hex: "#1a3a5c" }, // gates
  green:     { hex: "#0d7a3e" }, // high signals
  red:       { hex: "#8a1a1a" }, // low signals
  text:      { hex: "#0f2540" }, // primary text
  blue:      { hex: "#2980b9" }, // accent
}

const blueprintTheme = {
  canvas: {
    bg:     blueprintPalette.base,
    grid:   blueprintPalette.mantle,
  },
  gates: {
    logic:  blueprintPalette.surface,
    input:  {
      high: blueprintPalette.green,
      low:  blueprintPalette.red,
    },
    output: {
      high: blueprintPalette.green,
      low:  blueprintPalette.red,
    }
  },
  wires: {
    high:   blueprintPalette.green,
    low:    blueprintPalette.red,
    ghost:  blueprintPalette.mantle,
  },
  panel:   { bg: blueprintPalette.base },
  surface: { bg: blueprintPalette.base },
  accent:  blueprintPalette.blue,
  danger:  blueprintPalette.red,
  text: {
    primary: blueprintPalette.text,
    muted:   { hex: "#4a6a8a" }, // desaturated blueprint ink
    inverse: { hex: "#ffffff" },
  },
  font: {
    family: "'Inter', 'Segoe UI', sans-serif",
    google: "Inter:wght@400;500;600;700",
  },
  ui: {
    border:       { hex: "#0f2540", alpha: 0.12 },
    borderHover:  { hex: "#0f2540", alpha: 0.24 },
    overlay:      { hex: "#0f2540", alpha: 0.05 },
    overlayHover: { hex: "#0f2540", alpha: 0.10 },
  },
}


// ── Graphite Palette & Theme ────────────────────────────────
const graphitePalette = {
  base:      { hex: "#1c1c1c" }, // canvas background
  mantle:    { hex: "#252525" }, // grid
  surface:   { hex: "#3a3a3a" }, // gates
  green:     { hex: "#00e676" }, // high signals
  red:       { hex: "#ff1744" }, // low signals
  text:      { hex: "#eeeeee" }, // primary text
  blue:      { hex: "#40c4ff" }, // accent
}

const graphiteTheme = {
  canvas: {
    bg:     graphitePalette.base,
    grid:   graphitePalette.mantle,
  },
  gates: {
    logic:  graphitePalette.surface,
    input:  {
      high: graphitePalette.green,
      low:  graphitePalette.red,
    },
    output: {
      high: graphitePalette.green,
      low:  graphitePalette.red,
    }
  },
  wires: {
    high:   graphitePalette.green,
    low:    graphitePalette.red,
    ghost:  graphitePalette.mantle,
  },
  panel:   { bg: graphitePalette.surface },
  surface: { bg: graphitePalette.base },
  accent:  graphitePalette.blue,
  danger:  graphitePalette.red,
  text: {
    primary: graphitePalette.text,
    muted:   { hex: "#b0b0b0" }, // neutral dimmed text
    inverse: { hex: "#1c1c1c" },
  },
  font: {
    family: "'Inter', 'Segoe UI', sans-serif",
    google: "Inter:wght@400;500;600;700",
  },
  ui: {
    border:       { hex: "#eeeeee", alpha: 0.08 },
    borderHover:  { hex: "#eeeeee", alpha: 0.16 },
    overlay:      { hex: "#eeeeee", alpha: 0.04 },
    overlayHover: { hex: "#eeeeee", alpha: 0.08 },
  },
}

// ── Theme registry ─────────────────────────────────────────────
export const themes = {
  graphite:  { label: "Graphite",  theme: graphiteTheme },
  forge:     { label: "Forge",    theme: forgeTheme },
  terminal:  { label: "Terminal", theme: terminalTheme },
  voltage:   { label: "Voltage",  theme: voltageTheme },
  neon:      { label: "Neon",     theme: neonTheme },
  ocean:     { label: "Ocean",    theme: oceanTheme },
  molten:    { label: "Molten",   theme: moltenTheme },
  retro:     { label: "Retro",    theme: retroTheme },
  blueprint: { label: "Blueprint", theme: blueprintTheme },
};

const THEME_STORAGE_KEY = "gatecraft-theme";
let _activeThemeId = localStorage.getItem(THEME_STORAGE_KEY) || "graphite";

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
  applyTheme(themes[id].theme);
}

// ── Utility ────────────────────────────────────────────────────
function hexToRGB(hex) {
  // Remove '#' if present
  hex = hex.replace(/^#/, '');

  // Handle shorthand hex (e.g., "03F")
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }

  // Convert to integer
  const num = parseInt(hex, 16);

  // Extract RGB values
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

export {
  graphiteTheme,
  forgeTheme,
  terminalTheme,
  voltageTheme,
  neonTheme,
  oceanTheme,
  moltenTheme,
  retroTheme,
  blueprintTheme,
}