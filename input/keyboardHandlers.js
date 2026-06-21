import { state } from "../state.js";
import { changeMode, toggleSidebar } from "../ui/toolbar.js";

const shortcuts = {
  "1": () => changeMode("edit"),
  "2": () => changeMode("run"),
  "3": () => changeMode("delete"),
  "tab": () => toggleSidebar(),
}

function buildKeyCombo(p) {
  const parts = [];
  parts.push(p.key.toLowerCase());

  return parts.join("+");
}

export function registerKeyboardHandlers(p, circuit, renderNodes, wires) {
  p.keyPressed = function (event) {
    if (state.labelEditing) return;
    if (document.activeElement?.tagName === "INPUT") return;

    const combo = buildKeyCombo(p);
    console.log(combo);
    shortcuts[combo]?.();
  }
}