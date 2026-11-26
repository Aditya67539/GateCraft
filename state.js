export const state = {
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
  gridDirty: false,

  isInteractionBlocked() {
    return (
      this.ui.isAnyModalOpen ||
      this.ui.labelEditing ||
      this.wireEditing.active ||
      this.isPlacing()
    );
  },

  isPlacing() {
    return this.ghost.node || this.ghost.bus;
  },
};

/**
 * Convert screen-space coordinates to world-space (accounting for camera pan/zoom).
 * Use when comparing mouse position against gate/port/wire positions.
 */
export function screenToWorld(sx, sy) {
  return {
    x: (sx - state.camera.x) / state.camera.zoom,
    y: (sy - state.camera.y) / state.camera.zoom,
  };
}

/**
 * Convert world-space coordinates to screen-space (accounting for camera pan/zoom).
 * Use when positioning HTML overlays on top of canvas-rendered objects.
 */
export function worldToScreen(wx, wy) {
  return {
    x: wx * state.camera.zoom + state.camera.x,
    y: wy * state.camera.zoom + state.camera.y,
  };
}