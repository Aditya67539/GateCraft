import { getMenuTarget, hideAllMenus } from "./contextMenu.js";
import { state } from "../state.js";
import { RemoveBusCommand, RemoveGateCommand, RemoveWireCommand } from "../history/commands";
import { performCommand } from "../history/history.js";

export function registerContextMenuActions({
  circuit,
  renderNodes,
  wires,
  busNodes,
  nodeMap,
  busMap,
  wireDependents,
  openLabelEditor,
}) {
  // Wire and bus edit button
  document.getElementById("ctx-wire-edit").addEventListener("click", () => {
    const target = getMenuTarget("wire-context-menu");
    hideAllMenus();
    if (!target) return;
    state.wireEditing.active = true;
    state.wireEditing.target = target;
  });

  // Delete button
  document.querySelectorAll(".ctx-delete-target").forEach(element => {
    element.addEventListener("click", () => {
      const wireTarget = getMenuTarget("wire-context-menu");
      const gateTarget = getMenuTarget("gate-context-menu");
      const target = wireTarget || gateTarget;
      hideAllMenus();
      if (!target) return;

      if (target.type === "wire") {
        const removeWireCommand = new RemoveWireCommand(
          circuit,
          wires,
          target.source,
          wireDependents,
          nodeMap,
          busMap,
        );
        performCommand(removeWireCommand);
      } else if (target.type === "bus") {
        const removeBusCommand = new RemoveBusCommand(
          busNodes,
          wires,
          circuit,
          target.source,
          nodeMap,
          busMap,
          wireDependents,
        );
        performCommand(removeBusCommand);
      } else if (target.type === "gate") {
        const removeGateCommand = new RemoveGateCommand(
          renderNodes,
          wires,
          circuit,
          target.source,
          nodeMap,
          busMap,
          wireDependents,
        );
        console.log(removeGateCommand);
        performCommand(removeGateCommand);
      }
    });
  });

  // Label button for gates
  document.getElementById("ctx-gate-edit").addEventListener("click", () => {
    const target = getMenuTarget("gate-context-menu");
    if (!target || target.type !== "gate") return;
    openLabelEditor(target.source);
  })
}