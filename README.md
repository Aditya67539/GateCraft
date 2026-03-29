# GateCraft — Digital Logic Simulator

A browser-based digital logic circuit simulator built with [p5.js](https://p5js.org/). Place logic gates, wire them together, toggle inputs, and watch signals propagate in real time — including support for sequential circuits like SR latches and T flip-flops.

---

## Features

- **7 gate types** — AND, OR, NOT, NAND, NOR, XOR, XNOR
- **I/O components** — Input (toggle), Output (display), Clock (auto-oscillator)
- **Wire routing** — Orthogonal wires with draggable waypoints; auto-routes around gates
- **Signal propagation** — Color-coded wires (green = high, red = low)
- **Sequential circuit support** — Iterative settling handles feedback loops that don't resolve in a single pass
- **4 editor modes** — Edit, Run, Delete, Place
- **Drag to reposition** — Gates and connected wires move together

---

## Getting Started

No build step or package manager needed. Just serve the files over HTTP.

**Using the VS Code Live Server extension:**
```
Right-click index.html → Open with Live Server
```

**Using Python:**
```bash
python -m http.server 8000
# then open http://localhost:8000
```

> Opening `index.html` directly as a `file://` URL won't work because ES modules require an HTTP server.

---

## How to Use

### Building a circuit

1. Click any component in the left sidebar to pick it up, then click on the canvas to place it
2. In **Edit** mode, click and drag over a gate's output port (right side) to start drawing a wire
3. Click near the left side of another gate to complete the connection
4. Drag gates to reposition them; wires follow automatically

### Running a circuit

1. Switch to **Run** mode using the toolbar
2. Click an **Input** node to toggle it between `true` and `false`
3. Click a **Clock** node to start it oscillating (1 Hz by default); click again to stop it
4. Watch signals propagate through the circuit in real time

### Deleting components

Switch to **Delete** mode and click any gate to remove it along with all its connected wires.

---

## Project Structure

```
gatecraft/
├── sketch.js              # Entry point — p5 setup() and draw() only
├── state.js               # Shared mutable state (mode, dragging, ghostNode, etc.)
├── constants.js           # Compile-time constants (FREQUENCY, etc.)
│
├── logic/
│   ├── gates.js           # Input, Clock, Output, Gate classes
│   ├── wire.js            # Wire class
│   └── evaluate.js        # evaluateAll, evaluateOnce, settleCircuit
│
├── render/
│   ├── RenderPoint.js     # Visual wrapper around a gate — position, ports, hit-testing
│   ├── draw.js            # drawGate, drawWire
│   └── wireGeometry.js    # Waypoint computation and routing math
│
├── input/
│   └── mouseHandlers.js   # mousePressed, mouseDragged, mouseReleased
│
├── ui/
│   └── toolbar.js         # Mode switcher and sidebar button listeners
│
├── css/
│   └── style.css
├── js/
│   └── p5.min.js
└── index.html
```

---

## How Signal Evaluation Works

GateCraft uses two different evaluation strategies depending on the context:

**`evaluateAll`** — used when an input or clock changes. Starts from the changed input and propagates downstream using a queue, only re-evaluating gates whose upstream signals have changed.

**`settleCircuit`** — used after placing or deleting a wire. Repeatedly calls `evaluateOnce` until all wire signals stop changing (or 100 iterations pass). This handles feedback loops in sequential circuits (e.g. an SR latch) that require multiple passes to reach a stable state.

---

## Tech Stack

- [p5.js](https://p5js.org/) — canvas rendering and mouse event integration
- Vanilla JavaScript (ES modules) — no framework, no bundler
- HTML/CSS — layout and toolbar UI

---

## Roadmap / Ideas

- [ ] Save / load circuits to localStorage
- [ ] Custom gate labels
- [ ] Truth table generator
- [ ] Zoom and pan on the canvas
- [ ] Bundle common circuits (half adder, flip-flops) as reusable components