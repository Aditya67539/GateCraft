import { state } from "../state.js";

export const wireCtxMenu = document.getElementById("wire-context-menu");
export const gateCtxMenu = document.getElementById("gate-context-menu");

export function showContextMenu(contextMenu, clientX, clientY, target) {
  if (target.type === "gate") {
    const labelBtnDiv = document.getElementById("label-btn-div");
    if (target.source.gate.label) {
      labelBtnDiv.innerHTML = "Edit Label";
    } else {
      labelBtnDiv.innerHTML = "Add Label";
    }
  }

  state.ui.contextMenuTarget = target;
  contextMenu.classList.add("open");
  contextMenu.style.left = `${clientX}px`;
  contextMenu.style.top  = `${clientY}px`;

  const rect = contextMenu.getBoundingClientRect();
  if (rect.bottom > window.innerHeight) {
    contextMenu.style.top = `${Math.max(0, clientY - rect.height)}px`;
  }
  if (rect.right > window.innerWidth) {
    contextMenu.style.left = `${Math.max(0, clientX - rect.width)}px`;
  }
  state.ui.isAnyModalOpen = true;
}

export function hideContextMenu(contextMenu) {
  if (!contextMenu.classList.contains("open")) return;
  contextMenu.classList.remove("open");
  state.ui.contextMenuTarget = null;
  state.ui.isAnyModalOpen = false;
}

export function hideAllContextMenus() {
  hideContextMenu(wireCtxMenu);
  hideContextMenu(gateCtxMenu);
}

export function registerContextMenuListeners() {
  document.addEventListener("click", () => {
    hideAllContextMenus();
  });
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideAllContextMenus();
    }
  });

  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}