const _state = {
  _mode: "edit",
  justPlacedFromToolbar: false,
  ghostNode: null,
  ghostWire: null,
  ghostWireCleanup: null,
  dragging: null,
  selectedNode: null,
  offsetX: 0,
  offsetY: 0,
  currentX: 0,
  currentY: 0,
  changingPos: false,
  drawingWire: null,
  changingWayPoint: null,
  connectedWires: null,
  connectedWiresWaypoints: null,
  labelEditing: false,
  gridDirty: false,
  isAnyModalOpen: false,
};

/**
 * Global simulation state wrapped in a Proxy.
 *
 * Special behavior:
 * - `state.mode` is a virtual property backed by `_mode`
 * - Setting `state.mode` automatically updates the UI (#modeDisplay)
 *
 * This ensures `state.mode` is the single source of truth
 * for the current simulation mode and its visual representation.
 *
 * Avoid manually updating mode display elsewhere in the codebase.
 */
export const state = new Proxy(_state, {
  /**
   * Intercepts property assignments.
   * Handles special logic for `mode` updates.
   */
  set(target, prop, value) {
    if (prop === "mode") {
      target._mode = value;
      const modeDisplay = document.getElementById("modeDisplay");
      if (modeDisplay) {
        modeDisplay.textContent = `Mode: ${value.charAt(0).toUpperCase() + value.slice(1)}`;
      }
    } else {
      target[prop] = value;
    }
    return true;
  },
  
  /**
   * Intercepts property access.
   * Maps `mode` → `_mode`.
   */
  get(target, prop) {
    if (prop === "mode") return target._mode;
    return target[prop];
  },
});