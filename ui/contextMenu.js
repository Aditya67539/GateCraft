import { state } from "../state.js";

export const wireCtxMenu = document.getElementById("wire-context-menu");
export const gateCtxMenu = document.getElementById("gate-context-menu");
export const folderCtxMenu = document.getElementById("folder-context-menu");

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
  positionMenu(contextMenu, clientX, clientY);
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

function positionMenu(menu, startX, startY) {
  menu.classList.add("open");
  menu.style.left = `${startX}px`;
  menu.style.top  = `${startY}px`;

  const rect = menu.getBoundingClientRect();
  if (rect.bottom > window.innerHeight) {
    menu.style.top = `${Math.max(0, startY - rect.height)}px`;
  }
  if (rect.right > window.innerWidth) {
    menu.style.left = `${Math.max(0, startX - rect.width)}px`;
  }
}