export const SIGNAL = {
  LOW:  0,
  HIGH: 1,
  X:    2,
  Z:    3,
  E:    4,
}
export const GATE_DEFS = {
  and:         { inputs: 2, outputs: 1 },
  or:          { inputs: 2, outputs: 1 },
  not:         { inputs: 1, outputs: 1 },
  nand:        { inputs: 2, outputs: 1 },
  nor:         { inputs: 2, outputs: 1 },
  xor:         { inputs: 2, outputs: 1 },
  xnor:        { inputs: 2, outputs: 1 },
  input:       { inputs: 0, outputs: 1 },
  output:      { inputs: 1, outputs: 0 },
  "seven-seg": { inputs: 8, outputs: 0 },
  "Tri-state Buffer": { inputs: 2, outputs: 1 },
};
export const FREQUENCY = 1; // Hertz
export const CLOCK_TIMER = 120 /* seconds */ * 1000; // ms
export const FONT_SIZE = 16;
export const PORT_LABEL_SIZE = 14;
export const GRID_OFFSET = 5;
export const GRID_SIZE = 20;
export const PORT_RADIUS = 11;

// Stroke weights and thicknesses
export const DEFAULT_STROKE_WEIGHT = 1;
export const WIRE_THICKNESS = 5;
export const HOVERED_WIRE_THICKNESS = 7;
export const BUS_THICKNESS = 5;
export const HOVERED_BUS_THICKNESS = 7;
export const GATE_STROKE_WEIGHT = 1.5;
export const PORT_STROKE_WEIGHT = 1.5;
export const DISPLAY_BORDER_STROKE_WEIGHT = 4;
export const TOOLTIP_STROKE_WEIGHT = 1.2;

// Radii and dimensions
export const GATE_CORNER_RADIUS = 8;
export const DISPLAY_CORNER_RADIUS = 8;
export const WAYPOINT_RADIUS = 16;
export const HOVERED_WAYPOINT_RADIUS = 20;
export const BUS_POINT_RADIUS = 16;
export const BUS_BOUNDS_PADDING = 8;
export const SEVEN_SEG_GRID_HEIGHT = 11;

// Seven-segment display layout factors
export const DISPLAY_SIGN_WIDTH_FACTOR = 2;
export const DISPLAY_SIGN_GAP_FACTOR = 0.5;
export const DISPLAY_BEVEL_FACTOR = 0.5;
export const DISPLAY_LED_GAP_FACTOR = 0.125;

// Pin geometry
export const PIN_THICK_AT_GATE = PORT_RADIUS * 0.5;
export const PIN_THICK_AT_PORT = PORT_RADIUS * 0.16;
export const PIN_THICK_STUB_FRAC = 0.3;
export const PIN_TAPER_FRAC = 0.4;
export const PIN_THIN_STUB_FRAC = 0.3;
export const PIN_TENSION_BASE_FACTOR = 0.15;
export const PIN_TENSION_PORT_FACTOR = 0.85;

// Grid rendering
export const GRID_MIN_SPACING = 15;
export const GRID_DOT_SIZE = 3;

// Tooltip styling
export const TOOLTIP_FONT_SIZE = 12;
export const TOOLTIP_PADDING_X = 12;
export const TOOLTIP_PADDING_Y = 7;
export const TOOLTIP_HEIGHT = 26;
export const TOOLTIP_CORNER_RADIUS = 7;
export const TOOLTIP_ARROW_SIZE = 5;
export const TOOLTIP_GAP = 10;
export const TOOLTIP_SLIDE_OFFSET = 6;
export const TOOLTIP_PORT_CLEARANCE = 2;