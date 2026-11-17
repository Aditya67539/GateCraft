import { GATE_CATEGORIES, PORT_DETECTION_THRESHOLD, TOOLTIP_FADE_SPEED } from "../constants.js";
import { isNearPoint } from "../input/mouseHandlers.js";
import { state } from "../state.js";

export function detectHoveredPort(mouse, renderNodes, p) {
  let hoveredPortPosition = null;
  let hoveredNode = null;
  let hoveredPortIndex = null;
  let hoveredLabel = "";
  let portType = "";
  
  for (let i = 0; i < renderNodes.length; i++) {
    const gate = renderNodes[i].gate;
    const totalInputs  = gate.inputCount;
    const totalOutputs = gate.outputCount;

    for (let j = 0; j < totalInputs; j++) {
      const portPosition = renderNodes[i].getInputPortPositionByIndex(j, totalInputs);
      if (isNearPoint(mouse.x, mouse.y, portPosition, PORT_DETECTION_THRESHOLD)) {
        hoveredNode = renderNodes[i];
        hoveredPortIndex = j;
        hoveredPortPosition = portPosition;
        if (
          gate.category === GATE_CATEGORIES.COMPOSITE &&
          gate.internalInputs &&
          gate.internalInputs[j] &&
          gate.internalInputs[j].label
        ) {
          hoveredLabel = gate.internalInputs[j].label;
        } else if (
          gate.category === GATE_CATEGORIES.PRIMITIVE &&
          gate.type === "Tri-state Buffer"
        ) {
          if (j === 0) hoveredLabel = "enable";
          else if (j === 1) hoveredLabel = "data";
          else hoveredLabel = "in";
        } else {
          hoveredLabel = "in";
        }
        portType = "input";
      }
    }

    for (let j = 0; j < totalOutputs; j++) {
      const portPosition = renderNodes[i].getOutputPortPositionByIndex(j, totalOutputs);
      if (isNearPoint(mouse.x, mouse.y, portPosition, PORT_DETECTION_THRESHOLD)) {
        hoveredNode = renderNodes[i];
        hoveredPortIndex = j;
        hoveredPortPosition = portPosition;
        if (
          gate.category === GATE_CATEGORIES.COMPOSITE &&
          gate.internalOutputs &&
          gate.internalOutputs[j] &&
          gate.internalOutputs[j].label
        ) {
          hoveredLabel = gate.internalOutputs[j].label;
        } else {
          hoveredLabel = "out";
        }
        portType = "output";
      }
    }
  }

  // Update tooltip state
  const dt = p.deltaTime / 1000; // seconds
  if (hoveredPortPosition) {
    state.ui.tooltip.active = true;
    state.ui.tooltip.label = hoveredLabel;
    state.ui.tooltip.node = hoveredNode;
    state.ui.tooltip.port.index = hoveredPortIndex;
    state.ui.tooltip.port.position = hoveredPortPosition;
    state.ui.tooltip.port.type = portType;
    state.ui.tooltip.opacity = Math.min(1, state.ui.tooltip.opacity + TOOLTIP_FADE_SPEED * dt);
  } else {
    state.ui.tooltip.opacity = Math.max(0, state.ui.tooltip.opacity - TOOLTIP_FADE_SPEED * dt);
    if (state.ui.tooltip.opacity <= 0) {
      state.ui.tooltip.reset();
    }
  }
}