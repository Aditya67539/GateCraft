const palette = {
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
    bg:     palette.void,
    grid:   palette.pitch,
  },
  gates: {
    logic:  palette.indigo,
    input:  {
      high: palette.forest,
      low:  palette.brick,
    },
    output: {
      high: palette.forest,
      low:  palette.brick,
    }
  },
  wires: {
    high:   palette.forest,
    low:    palette.brick,
    ghost:  palette.slate,
  },
  panel: {
    bg:     palette.coal,
  },
  surface: {
    bg:     palette.graphite,
  },
  accent:   palette.emerald,
  danger:   palette.rust
}

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

export { forgeTheme };