import { spawnBasicNode, spawnCompositeNode } from "../render/RenderPoint.js";
import { state } from "../state.js";
import {
  saveCompositeGate,
  loadCompositeGate,
  listCompositeGates,
  deleteCompositeGate,
  renameCompositeGate,
  buildCircuitFromData,
} from "../persistence.js";
import {
  themes,
  getActiveThemeId,
  setActiveThemeId,
  SIGNAL_STATE_LABELS,
  setSignalColor,
  getSignalColors,
  resetSignalColors,
} from "../render/theme.js";
import { createModal } from "./modal.js";



// ─── Modal helpers ──────────────────────────────────────────────
const modal = document.getElementById("save-gate-modal");
const modalInput = document.getElementById("gate-name-input");
const modalSave = document.getElementById("modal-save-btn");
const modalCancel = document.getElementById("modal-cancel-btn");

const clearWarningModal = document.getElementById("clear-warning-modal");
const clearCancel = document.getElementById("clear-cancel-btn");
const clearConfirm = document.getElementById("clear-confirm-btn");

let _renderNodes = null;
let _wires = null;

function clearCanvas(circuit) {
  if (state.intervalId !== null) {
    clearInterval(state.intervalId);
    state.intervalId = null;
  }
  circuit.clear();
  _renderNodes.splice(0, _renderNodes.length);
  _wires.splice(0, _wires.length);
}

// ─── Settings panel helpers ─────────────────────────────────────
const settingsOverlay = document.getElementById("settings-overlay");
const settingsCloseBtn = document.getElementById("settings-close-btn");
const themeGrid = document.getElementById("theme-grid");

// Signal colors sub-panel
const signalColorsOverlay = document.getElementById("signal-colors-overlay");
const signalColorGrid = document.getElementById("signal-color-grid");
const signalBackBtn = document.getElementById("signal-colors-back-btn");
const signalCloseBtn = document.getElementById("signal-colors-close-btn");
const signalResetBtn = document.getElementById("signal-reset-btn");
const openSignalColorsBtn = document.getElementById("btn-open-signal-colors");

// ─── Theme icon SVGs ────────────────────────────────────────────
const THEME_ICONS = {
  light: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`,
  dark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>`,
};

const THEME_DESCRIPTIONS = {
  light: "Clean and bright",
  dark: "Easy on the eyes",
};

function renderThemeGrid() {
  themeGrid.innerHTML = "";
  const activeId = getActiveThemeId();

  for (const [id, entry] of Object.entries(themes)) {
    const card = document.createElement("button");
    card.className = `theme-card${id === activeId ? " active" : ""}`;
    card.dataset.themeId = id;

    card.innerHTML = `
      <div class="theme-card-icon ${id}-icon">
        ${THEME_ICONS[id] || THEME_ICONS.dark}
      </div>
      <div class="theme-card-info">
        <span class="theme-card-name">${entry.label}</span>
        <span class="theme-card-desc">${THEME_DESCRIPTIONS[id] || ""}</span>
      </div>
      <div class="theme-card-radio">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white"
          stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>
    `;

    card.addEventListener("click", () => {
      setActiveThemeId(id);
      renderThemeGrid();
    });

    themeGrid.appendChild(card);
  }
}

// ─── Signal Color Grid ──────────────────────────────────────────
function renderSignalColorGrid() {
  signalColorGrid.innerHTML = "";
  const current = getSignalColors();

  for (const [key, label] of Object.entries(SIGNAL_STATE_LABELS)) {
    const row = document.createElement("div");
    row.className = "signal-color-row";

    const hex = current[key];

    row.innerHTML = `
      <div class="signal-color-swatch-wrapper">
        <span class="signal-color-swatch" style="background:${hex}"></span>
        <input type="color" class="signal-color-input" value="${hex}" data-key="${key}">
      </div>
      <span class="signal-color-label">${label}</span>
      <span class="signal-color-hex">${hex.toUpperCase()}</span>
    `;

    // Click swatch → open native picker
    const swatch = row.querySelector(".signal-color-swatch");
    const input = row.querySelector(".signal-color-input");
    swatch.addEventListener("click", () => input.click());

    // Update color on change
    input.addEventListener("input", (e) => {
      const newHex = e.target.value;
      swatch.style.background = newHex;
      row.querySelector(".signal-color-hex").textContent = newHex.toUpperCase();
      setSignalColor(key, newHex);
    });

    signalColorGrid.appendChild(row);
  }
}

// ─── Signal Colors Sub-Panel Logic ──────────────────────────────
let _settingsModal = null;

function openSignalColorsPanel() {
  settingsOverlay.classList.remove("open");
  signalColorsOverlay.classList.add("open");
  renderSignalColorGrid();
  state.isAnyModalOpen = true;
}

function closeSignalColorsPanel() {
  signalColorsOverlay.classList.remove("open");
  state.isAnyModalOpen = false;
}

function backToSettings() {
  signalColorsOverlay.classList.remove("open");
  settingsOverlay.classList.add("open");
  renderThemeGrid();
}

openSignalColorsBtn.addEventListener("click", openSignalColorsPanel);
signalBackBtn.addEventListener("click", backToSettings);
signalCloseBtn.addEventListener("click", closeSignalColorsPanel);
signalResetBtn.addEventListener("click", () => {
  resetSignalColors();
  renderSignalColorGrid();
});

// Close signal panel on overlay click
signalColorsOverlay.addEventListener("click", (e) => {
  if (e.target === signalColorsOverlay) closeSignalColorsPanel();
});

// ─── Sidebar collapse / expand ──────────────────────────────────
const sidebar = document.getElementById("sidebar");
const sidebarCollapseBtn = document.getElementById("sidebar-collapse-btn");
const sidebarExpandBtn = document.getElementById("sidebar-expand-btn");

function collapseSidebar() {
  sidebar.classList.add("collapsed");
  sidebarExpandBtn.classList.add("visible");
}

function expandSidebar() {
  sidebar.classList.remove("collapsed");
  sidebarExpandBtn.classList.remove("visible");
}

export function toggleSidebar() {
  if (sidebar.classList.contains("collapsed")) expandSidebar();
  else collapseSidebar();
}

sidebarCollapseBtn.addEventListener("click", collapseSidebar);
sidebarExpandBtn.addEventListener("click", expandSidebar);

// ─── Section collapse / expand ──────────────────────────────────
document.querySelectorAll(".sidebar-section-header").forEach(header => {
  header.addEventListener("click", () => {
    const section = header.closest(".sidebar-section");
    section.classList.toggle("collapsed");
  });
});

// ─── Sidebar composite section ──────────────────────────────────
const compositeSection = document.getElementById("composite-section");
const compositeBtnGrid = document.getElementById("composite-btn-grid");

// ─── Custom context menu ───────────────────────────────────────
const ctxMenu = document.getElementById("composite-context-menu");
let _ctxTargetName = null;

function showContextMenu(e, name) {
  e.preventDefault();
  e.stopPropagation();
  _ctxTargetName = name;

  // Position the menu near the cursor, clamped to viewport
  const x = Math.min(e.clientX, window.innerWidth - 170);
  const y = Math.min(e.clientY, window.innerHeight - 100);
  ctxMenu.style.left = `${x}px`;
  ctxMenu.style.top = `${y}px`;
  ctxMenu.classList.add("open");

  state.isAnyModalOpen = true;
}

function hideContextMenu() {
  // Only modify state if the context menu is actually open
  if (!ctxMenu.classList.contains("open")) return;

  ctxMenu.classList.remove("open");
  _ctxTargetName = null;

  state.isAnyModalOpen = false;
}

// Close context menu on any click or Escape
document.addEventListener("click", hideContextMenu);
document.addEventListener("contextmenu", (e) => {
  // Close if right-clicking elsewhere
  if (ctxMenu.classList.contains("open") && !ctxMenu.contains(e.target)) {
    hideContextMenu();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideContextMenu();
  if (e.key === "Tab") e.preventDefault();
});

// Context menu actions
document.getElementById("ctx-rename").addEventListener("click", () => {
  const name = _ctxTargetName;
  hideContextMenu();
  if (!name) return;

  // Reuse the save modal for rename
  const renameModal = document.getElementById("rename-gate-modal");
  const renameInput = document.getElementById("rename-gate-input");
  const renameSave = document.getElementById("rename-save-btn");
  const renameCancel = document.getElementById("rename-cancel-btn");

  renameInput.value = name;
  renameModal.classList.add("open");
  renameInput.focus();
  renameInput.select();

  const doRename = () => {
    const newName = renameInput.value.trim();
    if (!newName || newName === name) {
      renameModal.classList.remove("open");
      cleanup();
      return;
    }
    if (renameCompositeGate(name, newName)) {
      refreshCompositeSection();
    }
    renameModal.classList.remove("open");
    cleanup();
  };

  const doCancel = () => {
    renameModal.classList.remove("open");
    cleanup();
  };

  const onKey = (e) => {
    if (e.key === "Enter") doRename();
    if (e.key === "Escape") doCancel();
  };

  const onOverlay = (e) => {
    if (e.target === renameModal) doCancel();
  };

  function cleanup() {
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

document.getElementById("ctx-delete").addEventListener("click", () => {
  const name = _ctxTargetName;
  hideContextMenu();
  if (!name) return;
  deleteCompositeGate(name);
  refreshCompositeSection();
});

// ─── Custom tooltip ───────────────────────────────────────────
const tooltip = document.getElementById("sidebar-tooltip");
let _tooltipTimeout = null;

function showTooltip(e, text) {
  clearTimeout(_tooltipTimeout);
  tooltip.textContent = text;
  tooltip.classList.add("visible");
  positionTooltip(e);
}

function positionTooltip(e) {
  const x = Math.min(e.clientX + 10, window.innerWidth - tooltip.offsetWidth - 10);
  const y = e.clientY - tooltip.offsetHeight - 8;
  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${Math.max(y, 4)}px`;
}

function hideTooltip() {
  _tooltipTimeout = setTimeout(() => {
    tooltip.classList.remove("visible");
  }, 50);
}

function refreshCompositeSection() {
  compositeBtnGrid.innerHTML = "";

  const names = listCompositeGates();

  if (names.length === 0) {
    const empty = document.createElement("p");
    empty.className = "composite-empty";
    empty.textContent = "No saved gates";
    compositeBtnGrid.appendChild(empty);
    return;
  }

  names.forEach(name => {
    const btn = document.createElement("button");
    btn.className = "addComponent composite-btn";
    btn.textContent = name;

    // Left-click: place the gate
    btn.addEventListener("click", () => {
      const circuit = loadCompositeGate(name);
      if (!circuit) return;
      const compositeGate = buildCircuitFromData(circuit.circuitData, circuit.renderData);
      state.justPlacedFromToolbar = true;
      spawnCompositeNode(name, compositeGate, 0, 0);
    });

    // Right-click: show context menu
    btn.addEventListener("contextmenu", (e) => showContextMenu(e, name));

    // Custom tooltip on hover (only if text is truncated)
    btn.addEventListener("mouseenter", (e) => {
      if (btn.scrollWidth > btn.clientWidth) {
        showTooltip(e, name);
      }
    });
    btn.addEventListener("mousemove", (e) => {
      if (tooltip.classList.contains("visible")) positionTooltip(e);
    });
    btn.addEventListener("mouseleave", hideTooltip);

    compositeBtnGrid.appendChild(btn);
  });
}

export function changeMode(mode) {
  state.mode = mode;
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
  const btnId = `#btn-${mode}`;
  document.querySelector(btnId).classList.add("active");
}


const saveAsCompositeBtn = document.getElementById("btn-save-gate");
const clearBtn = document.getElementById("btn-clear-canvas");
const settingsBtn = document.getElementById("btn-settings");
// ─── Main init ──────────────────────────────────────────────────
export function initToolbar(p, circuit, renderNodes, wires) {
  _renderNodes = renderNodes;
  _wires = wires;

  const warningModal = createModal({
    overlay: clearWarningModal,
    focusElement: clearConfirm,
    onConfirm: () => clearCanvas(circuit),
    onOpen: () => p.noLoop(),
    onClose: () => p.loop(),
  });

  const saveModal = createModal({
    overlay: modal,
    focusElement: modalInput,
    onConfirm: () => {
      const name = modalInput.value.trim();
      if (!name) { modalInput.focus(); return false; };
      saveCompositeGate(name, _renderNodes, _wires);
      clearCanvas(circuit);
      refreshCompositeSection();
    },
    onOpen: () => { modalInput.value = ""; p.noLoop() },
    onClose: () => p.loop(),
  });

  const settingsModal = createModal({
    overlay: settingsOverlay,
    onOpen: () => { renderThemeGrid(); },
  });

  // Segmented mode switcher
  document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      changeMode(btn.dataset.mode);
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

  // ─── Save as composite ────────────────────────────────────────
  saveAsCompositeBtn.addEventListener("click", () => saveModal.open());
  modalCancel.addEventListener("click", () => saveModal.close());
  modalSave.addEventListener("click", () => saveModal.confirm());
  modalInput.addEventListener("keydown", e => {
    if (e.key === "Enter") saveModal.confirm();
    else if (e.key === "Escape") saveModal.close();
  });

  // ─── Clear canvas ─────────────────────────────────────────────
  clearBtn.addEventListener("click", () => warningModal.open());
  clearCancel.addEventListener("click", () => warningModal.close());
  clearConfirm.addEventListener("click", () => warningModal.confirm());

  // ─── Settings panel ────────────────────────────────────────────
  settingsBtn.addEventListener("click", () => settingsModal.open());
  settingsCloseBtn.addEventListener("click", () => settingsModal.close());

  // Initial population of composite section
  refreshCompositeSection();

  // ─── Global custom tooltip for all [title] elements ───────────
  // Replaces native browser tooltips with the styled glassmorphism tooltip.
  // Converts title → data-tooltip on first hover to suppress the native tooltip.
  document.addEventListener("mouseenter", (e) => {
    if (!(e.target instanceof Element)) return;
    const el = e.target.closest("[title], [data-tooltip]");
    if (!el) return;

    // On first encounter, move title → data-tooltip to suppress native tooltip
    if (el.hasAttribute("title")) {
      el.dataset.tooltip = el.getAttribute("title");
      el.removeAttribute("title");
    }

    const text = el.dataset.tooltip;
    if (text) showTooltip(e, text);
  }, true);

  document.addEventListener("mousemove", (e) => {
    if (tooltip.classList.contains("visible")) {
      positionTooltip(e);
    }
  }, true);

  document.addEventListener("mouseleave", (e) => {
    if (!(e.target instanceof Element)) { hideTooltip(); return; }
    const el = e.target.closest("[data-tooltip]");
    if (el) hideTooltip();
  }, true);

  return {
    openSaveModal: () => saveModal.open(),
    openWarningModal: () => warningModal.open(),
    openSettings: () => settingsModal.open(),
    closeAllModals: () => { saveModal.close(); warningModal.close(); settingsModal.close(); closeSignalColorsPanel(); },
  }
}