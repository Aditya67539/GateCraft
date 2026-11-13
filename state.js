const _state = {
  _mode: "edit",
  camera: { x: 0, y: 0, zoom: 1, isPanning: false },

  interaction: {
    target: null,
    dragging: {
      active: false,
      originalPos: { x: 0, y: 0 },
      offset: { x: 0, y: 0 },

      reset() {
        this.active = false;
        this.originalPos.x = 0;
        this.originalPos.y = 0;
        this.offset.x = 0;
        this.offset.y = 0;
      }
    },
    wireCreation: null,
  },

  ghost: {
    node: null,
    wire: null, wireCleanup: null,
    bus: null, busCleanup: null,
  },

  ui: {
    contextMenuTarget: null,
    labelEditing: false,
    isAnyModalOpen: false,
    tooltip: {
      active: false,
      label: "",        // gate.label || gate.type
      opacity: 0,
      port: {
        index: null,
        position: { x: 0, y: 0 },
        type: "",       // input port || output port
      },
      node: null,

      reset() {
        this.active = false;
        this.label = "";
        this.opacity = 0;
        this.port.index = 0;
        this.port.position.x = 0;
        this.port.position.y = 0;
        this.port.type = "";
        this.node = null;
      }
    },
  },

  wireEditing: {
    active: false,
    target: null,

    waypoint: {
      move: {
        index: null,
        snapshot: null,

        reset() {
          this.index = null;
          this.snapshot = null;
        }
      },
      insert: {
        index: null,
        point: null,
        pendingCommand: null,

        reset() {
          this.index = null;
          this.point = null;
          this.pendingCommand = null;
        }
      },
    },

    isMovingWaypoint() {
      return (
        this.active &&
        this.target !== null &&
        this.waypoint.move.index !== null
      );
    },

    isInsertingWaypoint() {
      return (
        this.active &&
        this.target !== null &&
        this.waypoint.insert.index !== null &&
        this.waypoint.insert.point !== null
      );
    },

    reset() {
      this.active = false;
      this.target = null;
      this.waypoint.move.reset();
      this.waypoint.insert.reset();
    }
  },

  selectedNode: null,

  isInteractionBlocked() {
    return (
      this.ui.isAnyModalOpen ||
      this.ui.labelEditing ||
      this.wireEditing.active
    );
  }
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

/**
 * Convert screen-space coordinates to world-space (accounting for camera pan/zoom).
 * Use when comparing mouse position against gate/port/wire positions.
 */
export function screenToWorld(sx, sy) {
  return {
    x: (sx - _state.camera.x) / _state.camera.zoom,
    y: (sy - _state.camera.y) / _state.camera.zoom,
  };
}

/**
 * Convert world-space coordinates to screen-space (accounting for camera pan/zoom).
 * Use when positioning HTML overlays on top of canvas-rendered objects.
 */
export function worldToScreen(wx, wy) {
  return {
    x: wx * _state.camera.zoom + _state.camera.x,
    y: wy * _state.camera.zoom + _state.camera.y,
  };
}

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