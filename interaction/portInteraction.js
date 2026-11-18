import { GATE_CATEGORIES, PORT_DETECTION_THRESHOLD, TOOLTIP_FADE_SPEED, ROLE } from "../constants.js";
import { state } from "../state.js";
import { dist } from "../render/wireGeometry.js";

export function detectHoveredPort(mouse, renderNodes, p) {
  let isHoveringPort = false;
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
      isHoveringPort = true;
      state.ui.tooltip.node = renderNodes[i];
      state.ui.tooltip.port.index = j;
      state.ui.tooltip.port.position = closestInputPort.position;

      if (
        gate.category === GATE_CATEGORIES.COMPOSITE &&
        gate.internalInputs &&
        gate.internalInputs[j] &&
        gate.internalInputs[j].label
      ) {
        state.ui.tooltip.label = gate.internalInputs[j].label;
      } else if (
        gate.category === GATE_CATEGORIES.PRIMITIVE &&
        gate.type === "Tri-state Buffer"
      ) {
        if (j === 0) state.ui.tooltip.label = "enable";
        else if (j === 1) state.ui.tooltip.label = "data";
        else state.ui.tooltip.label = "in";
      } else {
        state.ui.tooltip.label = "in";
      }
      state.ui.tooltip.port.type = "input";
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
      isHoveringPort = true;
      state.ui.tooltip.node = renderNodes[i];
      state.ui.tooltip.port.index = j;
      state.ui.tooltip.port.position = closestOutputPort.position;

      if (
        gate.category === GATE_CATEGORIES.COMPOSITE &&
        gate.internalOutputs &&
        gate.internalOutputs[j] &&
        gate.internalOutputs[j].label
      ) {
        state.ui.tooltip.label = gate.internalOutputs[j].label;
      } else {
        state.ui.tooltip.label = "out";
      }
      state.ui.tooltip.port.type = "output";
      break;
    }
  }

  // Update tooltip state
  const dt = p.deltaTime / 1000; // seconds
  if (isHoveringPort) {
    state.ui.tooltip.active = true;
    state.ui.tooltip.opacity = Math.min(1, state.ui.tooltip.opacity + TOOLTIP_FADE_SPEED * dt);
  } else {
    state.ui.tooltip.opacity = Math.max(0, state.ui.tooltip.opacity - TOOLTIP_FADE_SPEED * dt);
    if (state.ui.tooltip.opacity <= 0) {
      state.ui.tooltip.reset();
    }
  }
}


export function shouldHighlightPort() {
  if (!state.ui.tooltip.active) return false;
  const node  = state.ui.tooltip.node;
  const index = state.ui.tooltip.port.index;
  const portType = state.ui.tooltip.port.type;

  if (!state.interaction.wireCreation) {
    if (portType === "input") {
      return node.gate.canConnect(index);
    }
    return true;
  } else {
    const role = state.interaction.wireCreation.role;

    if (role === ROLE.SOURCE) {
      if (portType === "output") return false;
      return node.gate.canConnect(index);
    } else if (role === ROLE.SINK) {
      return portType !== "input";
    } else if (role === ROLE.ANY) {
      if (portType === "input") {
        return node.gate.canConnect(index);
      } else if (portType === "output") {
        const busNode = state.interaction.wireCreation.entity.busNode;
        return busNode.bus.canConnect(node.gate, index);
      }
    }
  }
}


export function findClosestPort(mx, my, count, getPos, threshold) {
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