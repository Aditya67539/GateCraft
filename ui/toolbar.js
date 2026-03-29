import { createNode } from "../render/RenderPoint.js";
import { state } from "../state.js";

export const modeText = document.getElementById("modeDisplay");

export function initToolbar(p) {
  // Segmented mode switcher
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.mode = btn.dataset.mode;
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      modeText.textContent = `Mode: ${state.mode.charAt(0).toUpperCase() + state.mode.slice(1)}`;
    });
  });

  const buttons = document.querySelectorAll(".addComponent");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.type;
      state.justPlacedFromToolbar = true;
      createNode(type, p.mouseX, p.mouseY);
    });
  });
}