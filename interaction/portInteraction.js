import { GATE_CATEGORIES, PORT_DETECTION_THRESHOLD, TOOLTIP_FADE_SPEED } from "../constants.js";
import { state } from "../state.js";
import { dist } from "../render/wireGeometry.js";

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

    const closestInputPort = findClosestPort(
      mouse.x,
      mouse.y,
      totalInputs,
      (j, n) => renderNodes[i].getInputPortPositionByIndex(j, n),
      PORT_DETECTION_THRESHOLD,
    );

    if (closestInputPort) {
      const j = closestInputPort.index;
      hoveredNode = renderNodes[i];
      hoveredPortIndex = j;
      hoveredPortPosition = closestInputPort.position;

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
      break;
    }

    const closestOutputPort = findClosestPort(
      mouse.x,
      mouse.y,
      totalOutputs,
      (j, n) => renderNodes[i].getOutputPortPositionByIndex(j, n),
      PORT_DETECTION_THRESHOLD,
    );

    if (closestOutputPort) {
      const j = closestOutputPort.index;
      hoveredNode = renderNodes[i];
      hoveredPortIndex = j;
      hoveredPortPosition = closestOutputPort.position;

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
      break;
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


function findClosestPort(mx, my, count, getPos, threshold) {
  let best = null;
  for (let i = 0; i < count; i++) {
    const pos = getPos(i, count);
    const d = dist(mx, my, pos.x, pos.y);
    if (d <= threshold && (!best || d < best.distance)) {
      best = { index: i, position: pos, distance: d };
    }
  }
  return best;
}