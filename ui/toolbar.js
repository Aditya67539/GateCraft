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
import { themes, getActiveThemeId, setActiveThemeId } from "../render/theme.js";



// ─── Modal helpers ──────────────────────────────────────────────
const modal = document.getElementById("save-gate-modal");
const modalInput = document.getElementById("gate-name-input");
const modalSave = document.getElementById("modal-save-btn");
const modalCancel = document.getElementById("modal-cancel-btn");

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
}

function hideContextMenu() {
  ctxMenu.classList.remove("open");
  _ctxTargetName = null;
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

// ─── Main init ──────────────────────────────────────────────────
export function initToolbar(p, circuit, renderNodes, wires) {
  _renderNodes = renderNodes;
  _wires = wires;

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

  // Save-as-composite button
  document.getElementById("btn-save-gate").addEventListener("click", () => {
    openSaveModal();
    p.noLoop();
  });

  // Modal cancel
  modalCancel.addEventListener("click", () => {
    closeSaveModal();
    p.loop();
  });

  // Modal save
  modalSave.addEventListener("click", () => {
    const name = modalInput.value.trim();
    if (!name) { modalInput.focus(); return; }
    saveCompositeGate(name, _renderNodes, _wires);
    closeSaveModal();
    p.loop();
    clearCanvas(circuit);
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
  document.getElementById("btn-clear-canvas").addEventListener("click", () => {
    clearCanvas(circuit);
  });

  // ─── Settings panel ────────────────────────────────────────────
  document.getElementById("btn-settings").addEventListener("click", openSettings);
  settingsCloseBtn.addEventListener("click", closeSettings);
  settingsOverlay.addEventListener("click", e => {
    if (e.target === settingsOverlay) closeSettings();
  });

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
}