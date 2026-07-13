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