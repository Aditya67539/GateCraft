import { state } from "../state.js";
import { changeMode, toggleSidebar } from "../ui/toolbar.js";

function buildKeyCombo(p) {
  const parts = [];
  if (p.keyIsDown(p.CONTROL) || p.keyIsDown(91)) parts.push("control");
  if (p.keyIsDown(p.SHIFT)) parts.push("shift");
  parts.push(p.key.toLowerCase());

  return parts.join("+");
}

export function registerKeyboardHandlers(p, circuit, renderNodes, wires, actions) {
  // 1. Canvas-specific tool shortcuts (only active when the canvas has focus)
  const shortcuts = {
    "1": () => changeMode("edit"),
    "2": () => changeMode("run"),
    "3": () => changeMode("delete"),
    "tab": () => toggleSidebar(),
    "control+s": () => actions.openSaveModal(),
    "control+shift+x": () => actions.openWarningModal(),
    "control+,": () => actions.openSettings(),
  }

  p.keyPressed = function (event) {
    if (state.labelEditing) return;
    if (document.activeElement?.tagName === "INPUT" && event.key !== "Escape") return;

    const combo = buildKeyCombo(p);
    shortcuts[combo]?.();
  };

  // 2. Native Global Escape Listener
  // This runs independently of p5 canvas focus, catching Escape even inside active inputs!
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.isAnyModalOpen) {
      e.preventDefault();
      actions.closeAllModals();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "s") e.preventDefault();
  });
}