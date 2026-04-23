import { spawnBasicNode, spawnCompositeNode } from "../render/RenderPoint.js";
import { state } from "../state.js";
import {
  saveCompositeGate,
  loadCompositeGate,
  listCompositeGates,
  deleteCompositeGate,
} from "../persistence.js";
import { themes, getActiveThemeId, setActiveThemeId } from "../render/theme.js";



// ─── Modal helpers ──────────────────────────────────────────────
const modal = document.getElementById("save-gate-modal");
const modalInput = document.getElementById("gate-name-input");
const modalSave = document.getElementById("modal-save-btn");
const modalCancel = document.getElementById("modal-cancel-btn");

let _renderNodes = null;
let _wires = null;

function clearCanvas() {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  _renderNodes.splice(0, _renderNodes.length);
  _wires.splice(0, _wires.length);
}

function openSaveModal() {
  modalInput.value = "";
  modal.classList.add("open");
  modalInput.focus();
}

function closeSaveModal() {
  modal.classList.remove("open");
}

// ─── Settings panel helpers ─────────────────────────────────────
const settingsOverlay = document.getElementById("settings-overlay");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const themeGrid = document.getElementById("theme-grid");

function openSettings() {
  settingsOverlay.classList.add("open");
  renderThemeGrid();
}

function closeSettings() {
  settingsOverlay.classList.remove("open");
}

function renderThemeGrid() {
  themeGrid.innerHTML = "";
  const activeId = getActiveThemeId();

  for (const [id, entry] of Object.entries(themes)) {
    const card = document.createElement("button");
    card.className = `theme-card${id === activeId ? " active" : ""}`;
    card.dataset.themeId = id;

    // Pick representative colors for swatches
    const t = entry.theme;
    const swatchColors = [
      t.canvas.bg.hex,
      t.gates.logic.hex,
      t.gates.input.high.hex,
      t.wires.high.hex,
      t.accent.hex,
    ];

    card.innerHTML = `
      <div class="theme-swatches">
        ${swatchColors.map(c => `<span class="theme-swatch" style="background:${c}"></span>`).join("")}
      </div>
      <div class="theme-card-info">
        <span class="theme-card-name">${entry.label}</span>
        <span class="theme-card-active-badge">Active</span>
      </div>
    `;

    card.addEventListener("click", () => {
      setActiveThemeId(id);
      renderThemeGrid();
    });

    themeGrid.appendChild(card);
  }
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
  } else {
    compositeSection.querySelectorAll(".composite-empty").forEach(el => el.remove());
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
      spawnCompositeNode(name, circuitData, 0, 0);
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
    });
  });

  // Built-in component buttons
  document.querySelectorAll(".addComponent").forEach(button => {
    button.addEventListener("click", () => {
      const type = button.dataset.type;
      if (!type) return;          // skip composite-btn clicks (no data-type)
      state.justPlacedFromToolbar = true;
      spawnBasicNode(type, p.mouseX, p.mouseY);
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
    clearCanvas();
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

  // ─── Clear canvas ─────────────────────────────────────────────
  document.getElementById("btn-clear-canvas").addEventListener("click", clearCanvas);

  // ─── Settings panel ────────────────────────────────────────────
  document.getElementById("btn-settings").addEventListener("click", openSettings);
  settingsCloseBtn.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", e => {
    if (e.target === settingsOverlay) closeSettings();
  });

  // Initial population of composite section
  refreshCompositeSection();
}