import { getMenuTarget, hideAllMenus } from "./contextMenu.js";
import { state } from "../state.js";
import { RemoveBusCommand, RemoveGateCommand, RemoveWireCommand } from "../history/commands";
import { performCommand } from "../history/history.js";
import { renameCompositeGate } from "../persistence.js";
import { refreshCompositeSection } from "./toolbar.js";

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

export function registerSidebarMenuActions() {
  document.getElementById("ctx-rename").addEventListener("click", () => {
    const name = getMenuTarget("composite-context-menu");
    hideAllMenus();
    console.log(name);
    if (!name) return;

    const renameModal  = document.getElementById("rename-gate-modal");
    const renameInput  = document.getElementById("rename-gate-input");
    const renameSave   = document.getElementById("rename-save-btn");
    const renameCancel = document.getElementById("rename-cancel-btn");
    
    renameInput.value = name;
    renameModal.classList.add("open");
    renameInput.focus();
    renameInput.select();

    const doRename = () => {
      const newName = renameInput.value.trim();
      renameModal.classList.remove("open");
      if (!newName || newName === name) {
        cleanup();
        return;
      }
      if (renameCompositeGate(name, newName)) {
        refreshCompositeSection();
      }
      cleanup();
    }

    const doCancel = () => {
      renameModal.classList.remove("open");
      cleanup();
    }

    const onKey = (e) => {
      if (e.key === "Enter")  doRename();
      if (e.key === "Escape") doCancel();
    }

    const onOverlay = (e) => {
      if (e.target === renameModal) doCancel();
    }

    const cleanup = () => {
      renameSave.removeEventListener("click", doRename);
      renameCancel.removeEventListener("click", doCancel);
      renameInput.removeEventListener("keydown", onKey);
      renameModal.removeEventListener("click", onOverlay);
    }

    renameSave.addEventListener("click", doRename);
    renameCancel.addEventListener("click", doCancel);
    renameInput.addEventListener("keydown", onKey);
    renameModal.addEventListener("click", onOverlay);
  });
}