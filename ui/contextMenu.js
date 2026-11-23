import { state } from "../state.js";
import { listCompositeFolders, getGateFolder, setGateFolder } from "../persistence.js";
import { refreshCompositeSection } from "./toolbar.js";

const menus = new Map();

function registerMenu(id, options = {}) {
  const element = document.getElementById(id);
  menus.set(id, { element, target: null, ...options });
}

registerMenu("wire-context-menu");
registerMenu("gate-context-menu");
registerMenu("folder-context-menu");
registerMenu("composite-context-menu");
registerMenu("ctx-folder-submenu");

export function showMenu(menuId, clientX, clientY, target, options = {}) {
  hideAllMenus();

  // Run any menu-specific pre-show logic
  const entry = menus.get(menuId);
  if (options.onBeforeShow) options.onBeforeShow(target);

  entry.target = target;
  positionMenu(entry.element, clientX, clientY);
  state.ui.isAnyModalOpen = true;
}

export function hideMenu(menuId) {
  const entry = menus.get(menuId);
  if (!entry.element.classList.contains("open")) return;
  entry.element.classList.remove("open");
  entry.target = null;

  if (menuId === "composite-context-menu") {
    const submenu = menus.get("ctx-folder-submenu");
    if (submenu) {
      submenu.element.classList.remove("open");
      submenu.target = null;
    }
  }

  state.ui.isAnyModalOpen = false;
}

export function hideAllMenus() {
  for (const [id] of menus) {
    hideMenu(id);
  }
}

export function getMenuTarget(menuId) {
  return menus.get(menuId)?.target ?? null;
}

export function registerContextMenuListeners() {
  document.addEventListener("click", () => {
    hideAllMenus();
  });
  
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideAllMenus();
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


export function populateFolderSubmenu(gateName) {
  const ctxFolderSubmenu = document.getElementById("ctx-folder-submenu");
  ctxFolderSubmenu.innerHTML = "";

  const folders = listCompositeFolders();
  const currentFolder = getGateFolder(gateName);

  const folderIconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;

  folders.forEach(folder => {
    const btn = document.createElement("button");
    btn.className = `ctx-submenu-item${folder === currentFolder ? " active" : ""}`;
    btn.innerHTML = `<span class="folder-icon">${folderIconSvg}</span>${folder}`;
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (folder !== currentFolder) {
        setGateFolder(gateName, folder);
        refreshCompositeSection();
      }
      hideAllMenus();
    });
    ctxFolderSubmenu.appendChild(btn);
  });
}