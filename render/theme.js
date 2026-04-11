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
  danger:   forgePalette.rust
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
  danger: neonPalette.pink
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
  danger: terminalPalette.scarlet
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
  danger: moltenPalette.scarlet
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
  danger: oceanPalette.coral
}

// ── Theme registry ─────────────────────────────────────────────
export const themes = {
  forge:    { label: "Forge",    theme: forgeTheme },
  neon:     { label: "Neon",     theme: neonTheme },
  terminal: { label: "Terminal", theme: terminalTheme },
  molten:   { label: "Molten",   theme: moltenTheme },
  ocean:    { label: "Ocean",    theme: oceanTheme },
};

const THEME_STORAGE_KEY = "gatecraft-theme";
let _activeThemeId = localStorage.getItem(THEME_STORAGE_KEY) || "forge";

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

  function flatten(obj, prefix = "theme") {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const val = obj[key];
        const newPrefix = prefix ? `${prefix}-${key}` : key;
        
        if (val && typeof val.hex === "string") {
          // Inject hex
          root.style.setProperty(`--${newPrefix}`, val.hex);
          // Inject rgb components for rgba() usage
          const { r, g, b } = hexToRGB(val.hex);
          root.style.setProperty(`--${newPrefix}-rgb`, `${r}, ${g}, ${b}`);
        } else if (typeof val === "object") {
          flatten(val, newPrefix);
        }
      }
    }
  }

  flatten(theme);
}

export { forgeTheme, neonTheme, terminalTheme, moltenTheme, oceanTheme };