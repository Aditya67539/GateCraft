import { createNode, createCompositeNode } from "../render/RenderPoint.js";
import { state } from "../state.js";
import {
  saveCompositeGate,
  loadCompositeGate,
  listCompositeGates,
  deleteCompositeGate,
} from "../persistence.js";

export const modeText = document.getElementById("modeDisplay");

// ─── Modal helpers ──────────────────────────────────────────────
const modal = document.getElementById("save-gate-modal");
const modalInput = document.getElementById("gate-name-input");
const modalSave = document.getElementById("modal-save-btn");
const modalCancel = document.getElementById("modal-cancel-btn");

let _renderNodes = null;
let _wires = null;

function openSaveModal() {
  modalInput.value = "";
  modal.classList.add("open");
  modalInput.focus();
}

function closeSaveModal() {
  modal.classList.remove("open");
}

// ─── Sidebar composite section ──────────────────────────────────
const compositeSection = document.getElementById("composite-section");

function refreshCompositeSection() {
  // Remove old dynamic buttons (keep the header label)
  compositeSection.querySelectorAll(".composite-gate-row").forEach(el => el.remove());

  const names = listCompositeGates();

  if (names.length === 0) {
    const empty = document.createElement("p");
    empty.className = "composite-empty";
    empty.textContent = "No saved gates";
    compositeSection.appendChild(empty);
    return;
  }

  names.forEach(name => {
    const row = document.createElement("div");
    row.className = "composite-gate-row";

    const btn = document.createElement("button");
    btn.className = "addComponent composite-btn";
    btn.title = `Place ${name}`;
    btn.textContent = name;
    btn.addEventListener("click", () => {
      const circuitData = loadCompositeGate(name);
      if (!circuitData) return;
      state.justPlacedFromToolbar = true;
      createCompositeNode(name, circuitData, 0, 0);
    });

    const del = document.createElement("button");
    del.className = "composite-delete-btn";
    del.title = `Delete ${name}`;
    del.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`;
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteCompositeGate(name);
      refreshCompositeSection();
    });

    row.appendChild(btn);
    row.appendChild(del);
    compositeSection.appendChild(row);
  });
}

// ─── Main init ──────────────────────────────────────────────────
export function initToolbar(p, renderNodes, wires) {
  _renderNodes = renderNodes;
  _wires = wires;

  // Segmented mode switcher
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.mode = btn.dataset.mode;
      document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      modeText.textContent = `Mode: ${state.mode.charAt(0).toUpperCase() + state.mode.slice(1)}`;
    });
  });

  // Built-in component buttons
  document.querySelectorAll(".addComponent").forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.type;
      if (!type) return;          // skip composite-btn clicks (no data-type)
      state.justPlacedFromToolbar = true;
      createNode(type, p.mouseX, p.mouseY);
    });
  });

  // Save-as-composite button
  document.getElementById("btn-save-gate").addEventListener("click", openSaveModal);

  // Modal cancel
  modalCancel.addEventListener("click", closeSaveModal);

  // Modal save
  modalSave.addEventListener("click", () => {
    const name = modalInput.value.trim();
    if (!name) { modalInput.focus(); return; }
    saveCompositeGate(name, _renderNodes, _wires);
    closeSaveModal();
    refreshCompositeSection();
  });

  // Allow Enter key in the name field
  modalInput.addEventListener("keydown", e => {
    if (e.key === "Enter") modalSave.click();
    if (e.key === "Escape") closeSaveModal();
  });

  // Click outside modal to close
  modal.addEventListener("click", e => {
    if (e.target === modal) closeSaveModal();
  });

  // Initial population of composite section
  refreshCompositeSection();
}