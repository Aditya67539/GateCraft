import {
  RemoveBusCommand,
  RemoveGateCommand,
  RemoveWireCommand,
} from "../history/commands";
import {
  DEFAULT_FOLDER,
  deleteCompositeFolder,
  deleteCompositeGate,
  renameCompositeFolder,
  renameCompositeGate,
} from "../persistence.js";
import { getMenuTarget, hideAllMenus, hideMenu, showSubmenu } from "./contextMenu.js";
import { state } from "../state.js";
import { performCommand } from "../history/history.js";
import { refreshCompositeSection } from "./toolbar.js";

export function registerContextMenuActions({
  circuit,
  renderNodes,
  wires,
  busNodes,
  nodeMap,
  busMap,
  wireDependents,
  openLabelEditor,
}) {
  // Wire and bus edit button
  document.getElementById("ctx-wire-edit").addEventListener("click", () => {
    const target = getMenuTarget("wire-context-menu");
    hideAllMenus();
    if (!target) return;
    state.wireEditing.active = true;
    state.wireEditing.target = target;
  });

  // Delete button
  document.querySelectorAll(".ctx-delete-target").forEach(element => {
    element.addEventListener("click", () => {
      const wireTarget = getMenuTarget("wire-context-menu");
      const gateTarget = getMenuTarget("gate-context-menu");
      const target = wireTarget || gateTarget;
      hideAllMenus();
      if (!target) return;

      if (target.type === "wire") {
        const removeWireCommand = new RemoveWireCommand(
          circuit,
          wires,
          target.source,
          wireDependents,
          nodeMap,
          busMap,
        );
        performCommand(removeWireCommand);
      } else if (target.type === "bus") {
        const removeBusCommand = new RemoveBusCommand(
          busNodes,
          wires,
          circuit,
          target.source,
          nodeMap,
          busMap,
          wireDependents,
        );
        performCommand(removeBusCommand);
      } else if (target.type === "gate") {
        const removeGateCommand = new RemoveGateCommand(
          renderNodes,
          wires,
          circuit,
          target.source,
          nodeMap,
          busMap,
          wireDependents,
        );
        console.log(removeGateCommand);
        performCommand(removeGateCommand);
      }
    });
  });

  // Label button for gates
  document.getElementById("ctx-gate-edit").addEventListener("click", () => {
    const target = getMenuTarget("gate-context-menu");
    if (!target || target.type !== "gate") return;
    openLabelEditor(target.source);
  })
}

export function registerSidebarMenuActions() {
  /** Composite gate button context menu actions */
  document.getElementById("ctx-rename").addEventListener("click", () => {
    const name = getMenuTarget("composite-context-menu");
    hideAllMenus();
    if (!name) return;

    const renameModal  = document.getElementById("rename-gate-modal");
    const renameInput  = document.getElementById("rename-gate-input");
    const renameSave   = document.getElementById("rename-save-btn");
    const renameCancel = document.getElementById("rename-cancel-btn");
    
    renameInput.value = name;
    renameModal.classList.add("open");
    renameInput.focus();
    renameInput.select();

    const doRename = () => {
      const newName = renameInput.value.trim();
      renameModal.classList.remove("open");
      if (!newName || newName === name) {
        cleanup();
        return;
      }
      if (renameCompositeGate(name, newName)) {
        refreshCompositeSection();
      }
      cleanup();
    }

    const doCancel = () => {
      renameModal.classList.remove("open");
      cleanup();
    }

    const onKey = (e) => {
      if (e.key === "Enter")  doRename();
      if (e.key === "Escape") doCancel();
    }

    const onOverlay = (e) => {
      if (e.target === renameModal) doCancel();
    }

    const cleanup = () => {
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
    const name = getMenuTarget("composite-context-menu");
    hideAllMenus();
    if (!name) return;
    deleteCompositeGate(name);
    refreshCompositeSection();
  });

  const ctxMoveToFolder  = document.getElementById("ctx-move-to-folder");
  const ctxFolderSubmenu = document.getElementById("ctx-folder-submenu");

  ctxMoveToFolder.addEventListener("click", (e) => {
    e.stopPropagation();

    if (ctxFolderSubmenu.classList.contains("open")) {
      hideMenu("ctx-folder-submenu");
    } else {
      const anchorRect = ctxMoveToFolder.getBoundingClientRect();
      showSubmenu("ctx-folder-submenu", anchorRect);
    }
  });


  /** Folder header context menu actions */

  // Track collapsed state of folders across refreshes
  const _collapsedFolders = new Set();

  document.getElementById("ctx-folder-delete").addEventListener("click", () => {
    const folderName = getMenuTarget("folder-context-menu");
    hideAllMenus();
    if (!folderName || folderName === DEFAULT_FOLDER) return;

    const deleteModal = document.getElementById("delete-folder-warning-modal");
    const cancelBtn   = document.getElementById("delete-folder-cancel-btn");
    const confirmBtn  = document.getElementById("delete-folder-confirm-btn");

    deleteModal.classList.add("open");
    state.ui.isAnyModalOpen = true;

    const doDelete = () => {
      _collapsedFolders.delete(folderName);
      deleteCompositeFolder(folderName);
      refreshCompositeSection();
      deleteModal.classList.remove("open");
      state.ui.isAnyModalOpen = false;
      cleanup();
    };

    const doCancel = () => {
      deleteModal.classList.remove("open");
      state.ui.isAnyModalOpen = false;
      cleanup();
    };

    const onKey = (e) => {
      if (e.key === "Enter")  doDelete();
      if (e.key === "Escape") doCancel();
    };

    const onOverlay = (e) => {
      if (e.target === deleteModal) doCancel();
    };

    const cleanup = () => {
      confirmBtn.removeEventListener("click", doDelete);
      cancelBtn.removeEventListener("click", doCancel);
      document.removeEventListener("keydown", onKey);
      deleteModal.removeEventListener("click", onOverlay);
    };

    confirmBtn.addEventListener("click", doDelete);
    cancelBtn.addEventListener("click", doCancel);
    document.addEventListener("keydown", onKey);
    deleteModal.addEventListener("click", onOverlay);
  });

  document.getElementById("ctx-folder-rename").addEventListener("click", () => {
    const folderName = getMenuTarget("folder-context-menu");
    hideAllMenus();
    console.log(folderName);
    if (!folderName || folderName === DEFAULT_FOLDER) return;

    const renameFolderModal  = document.getElementById("rename-folder-modal");
    const renameFolderInput  = document.getElementById("rename-folder-input");
    const renameFolderSave   = document.getElementById("rename-folder-save-btn");
    const renameFolderCancel = document.getElementById("rename-folder-cancel-btn");
    
    renameFolderInput.value = folderName;
    renameFolderModal.classList.add("open");
    renameFolderInput.focus();
    renameFolderInput.select();
    state.ui.isAnyModalOpen = true;

    const doRename = () => {
      const newName = renameFolderInput.value.trim();
      if (!newName || newName === folderName) {
        renameFolderModal.classList.remove("open");
        state.ui.isAnyModalOpen = false;
        cleanup();
        return;
      }
      if (renameCompositeFolder(folderName, newName)) {
        // Preserve collapsed state under the new name
        if (_collapsedFolders.has(folderName)) {
          _collapsedFolders.delete(folderName);
          _collapsedFolders.add(newName);
        }
        refreshCompositeSection();
      }
      renameFolderModal.classList.remove("open");
      state.ui.isAnyModalOpen = false;
      cleanup();
    };

    const doCancel = () => {
      renameFolderModal.classList.remove("open");
      state.ui.isAnyModalOpen = false;
      cleanup();
    };

    const onKey = (e) => {
      if (e.key === "Enter")  doRename();
      if (e.key === "Escape") doCancel();
    };

    const onOverlay = (e) => {
      if (e.target === renameFolderModal) doCancel();
    };

    const cleanup = () => {
      renameFolderSave.removeEventListener("click", doRename);
      renameFolderCancel.removeEventListener("click", doCancel);
      renameFolderInput.removeEventListener("keydown", onKey);
      renameFolderModal.removeEventListener("click", onOverlay);
    };

    renameFolderSave.addEventListener("click", doRename);
    renameFolderCancel.addEventListener("click", doCancel);
    renameFolderInput.addEventListener("keydown", onKey);
    renameFolderModal.addEventListener("click", onOverlay);
  });
}