import { rebuildBusMap } from "../render/BusNode.js";
import { rebuildNodeMap } from "../render/RenderNode.js";
import { BusConnectionView, GateConnectionView, getTapPointFromElement } from "../render/wireGeometry.js";
import { showToast } from "../ui/toast.js";
import { performCommand } from "./history.js";

/**
 * @typedef {Object} Command
 * @property {function(): boolean} do - Applies the change. Returns true if
 *   the change was applied, false if it was rejected (e.g. failed validation).
 *   A false return means the command must NOT be pushed onto the undo stack. 
 * @property {function(): void} undo - Reverses a change previously applied
 *   by do(). Must fully undo do()'s effects, including any derived state
 *   that do() caused to be recomputed. 
 */


/** @implements {Command} */
export class PlaceGateCommand {
  constructor(circuit, renderNodes, ghostNode, nodeMap) {
    this.circuit = circuit;
    this.renderNodes = renderNodes;
    this.ghostNode = ghostNode;
    this.nodeMap = nodeMap;
  }

  do() {
    this.circuit.registerGate(this.ghostNode.gate);
    this.renderNodes.push(this.ghostNode);
    rebuildNodeMap(this.renderNodes, this.nodeMap);
    return true;
  }

  undo() {
    const nodeIndex = this.renderNodes.indexOf(this.ghostNode);
    const gateId = this.ghostNode.gate.id;

    this.circuit.removeGate(gateId);
    this.renderNodes.splice(nodeIndex, 1);

    rebuildNodeMap(this.renderNodes, this.nodeMap);
  }
}


/** @implements {Command} */
export class RemoveGateCommand {
  constructor(renderNodes, wires, circuit, node, nodeMap, busMap, wireDependents) {
    this.renderNodes = renderNodes;
    this.wires = wires;
    this.circuit = circuit;
    this.node = node;
    this.nodeMap = nodeMap;
    this.busMap = busMap;
    this.wireDependents = wireDependents;
  }

  do() {
    const nodeIndex = this.renderNodes.indexOf(this.node);
    const gateId = this.node.gate.id;

    const wiresToRemove = this.wires.filter(n => n.wire.from.id === gateId || n.wire.to.id === gateId);

    this.dependentWireSnapshots = new Map();

    wiresToRemove.forEach(w => {
      const children = this.wireDependents.get(w) ?? [];
      const childrenSnapshot = reparentDependents(
        w,
        children,
        this.wireDependents,
        this.nodeMap,
        this.busMap,
      );
      this.dependentWireSnapshots.set(w, childrenSnapshot);
      this.wireDependents.delete(w);
      this.wires.splice(this.wires.indexOf(w), 1);
    });
    
    this.circuit.removeGate(gateId);
    this.renderNodes.splice(nodeIndex, 1);
    rebuildNodeMap(this.renderNodes, this.nodeMap);
    this.wiresRemoved = wiresToRemove;
    return true;
  }

  undo() {
    this.circuit.registerGate(this.node.gate);
    this.renderNodes.push(this.node);

    for (const w of this.wiresRemoved) {
      const fromGate = w.wire.from;
      const toGate = w.wire.to;
      const inputIndex = w.wire.toInputIndex;
      const outputIndex = w.wire.fromOutputIndex;

      const result = this.circuit.connectToGate(fromGate, toGate, inputIndex, outputIndex);
      if (!result.ok) {
        showToast(result.error, { type: "error" });
        continue;
      }

      w.wire = result.wire;
      this.wires.push(w);
    }


    for (const [parent, childrenSnapshot] of this.dependentWireSnapshots) {
      restoreDependents(parent, childrenSnapshot, this.wireDependents);
    }
    
    rebuildNodeMap(this.renderNodes, this.nodeMap);
  }
}


/** @implements {Command} */
export class RemoveBusCommand {
  constructor(busNodes, wires, circuit, busNode, nodeMap, busMap, wireDependents) {
    this.busNodes = busNodes;
    this.wires = wires;
    this.circuit = circuit;
    this.busNode = busNode;
    this.busMap = busMap;
    this.nodeMap = nodeMap;
    this.wireDependents = wireDependents;
  }

  do() {
    const busIndex = this.busNodes.indexOf(this.busNode);
    const busId = this.busNode.bus.id;

    const wiresToRemove = this.wires.filter(n => n.wire.from.id === busId || n.wire.to.id === busId);

    this.dependentWireSnapshots = new Map();

    wiresToRemove.forEach(w => {
      const children = this.wireDependents.get(w) ?? [];
      const childrenSnapshot = reparentDependents(
        w,
        children,
        this.wireDependents,
        this.nodeMap,
        this.busMap,
      );
      this.dependentWireSnapshots.set(w, childrenSnapshot);
      this.wireDependents.delete(w);
      this.wires.splice(this.wires.indexOf(w), 1);
    });
    
    this.circuit.removeBus(busId);
    this.busNodes.splice(busIndex, 1);
    rebuildBusMap(this.busNodes, this.busMap);
    this.wiresRemoved = wiresToRemove;
    return true;
  }

  undo() {
    this.circuit.registerBus(this.busNode.bus);
    this.busNodes.push(this.busNode);

    for (const w of this.wiresRemoved) {
      let result;
      if (w.direction === "in") {
        const fromGate = w.wire.from;
        const outputIndex = w.portIndex;
        
        result = this.circuit.connectToBus(this.busNode.bus, fromGate, outputIndex);
        if (!result.ok) {
          showToast(result.error, { type: "error" });
          continue;
        }
      } else if (w.direction === "out") {
        const toGate = w.wire.to;
        const fromBus = this.busNode.bus;
        const inputIndex = w.portIndex;

        result = this.circuit.connectToGate(fromBus, toGate, inputIndex);
        if (!result.ok) {
          showToast(result.error, { type: "error" });
          continue;
        }
      }

      w.wire = result.wire;
      this.wires.push(w);
    }

    for (const [parent, childrenSnapshot] of this.dependentWireSnapshots) {
      restoreDependents(parent, childrenSnapshot, this.wireDependents);
    }

    rebuildBusMap(this.busNodes, this.busMap);
  }
}


/** @implements {Command} */
export class GateConnectionCommand {
  constructor(circuit, fromGate, toGate, inputIndex, outputIndex, ghostWire, wires, wireDependents, isWireBranch = false, source = null) {
    this.circuit = circuit;
    this.fromGate = fromGate;
    this.toGate = toGate;
    this.inputIndex = inputIndex;
    this.outputIndex = outputIndex;
    this.ghostWire = ghostWire;
    this.wires = wires;
    this.wireDependents = wireDependents;
    this.isWireBranch = isWireBranch;
    this.source = source;
    this.connection = null;
  }

  do() {
    const result = this.circuit.connectToGate(this.fromGate, this.toGate, this.inputIndex, this.outputIndex);
    if (!result.ok) {
      showToast(result.error, { type: "error" });
      return false;
    }
    let wire = result.wire;

    if (this.connection !== null) {
      this.connection.wire = result.wire;
    } else {
      this.connection = new GateConnectionView({ wire, waypoints: this.ghostWire, isWireBranch: this.isWireBranch, source: this.source });
    }
    this.wires.push(this.connection);

    if (this.isWireBranch) {
      if (!(this.wireDependents.has(this.source.conn))) {
        this.wireDependents.set(this.source.conn, new Set());
      }
      this.wireDependents.get(this.source.conn).add(this.connection);
    }
    return true;
  }

  undo() {
    if (this.isWireBranch) {
      this.wireDependents.get(this.source.conn).delete(this.connection);
    }
    this.circuit.removeWire(this.connection.wire);
    this.wires.splice(this.wires.indexOf(this.connection), 1);
  }
}


/** @implements {Command} */
export class BusConnectionCommand {
  constructor(circuit, gate, bus, ghostWire, wires, direction, index, tapRef, wireDependents, isWireBranch = false, source = null) {
    this.circuit = circuit;
    this.gate = gate;
    this.bus = bus;
    this.ghostWire = ghostWire;
    this.wires = wires;
    this.direction = direction;
    this.index = index;
    this.tapRef = tapRef;
    this.wireDependents = wireDependents;
    this.isWireBranch = isWireBranch;
    this.source = source;
    this.connection = null;
  }

  do() {
    let result;
    if (this.direction === "in") {
      result = this.circuit.connectToBus(this.bus, this.gate, this.index);
    } else {
      result = this.circuit.connectToGate(this.bus, this.gate, this.index);
    }
    if (!result.ok) {
      showToast(result.error, { type: "error" });
      return false;
    }
    let wire = result.wire;

    if (this.connection !== null) {
      this.connection.wire = result.wire;
    } else {
      const wireInfo = {
        wire,
        waypoints: this.ghostWire,
        isWireBranch: this.isWireBranch,
        tapRef: this.tapRef,
        source: this.source,
      };
      this.connection = new BusConnectionView(
        wireInfo,
        this.bus.id,
        this.gate.id,
        this.index,
        this.direction,
      );
    }

    this.wires.push(this.connection);

    if (this.isWireBranch) {
      if (!(this.wireDependents.has(this.source.conn))) {
        this.wireDependents.set(this.source.conn, new Set());
      }
      this.wireDependents.get(this.source.conn).add(this.connection);
    }
    return true;
  }

  undo() {
    if (this.isWireBranch) {
      this.wireDependents.get(this.source.conn).delete(this.connection);
    }
    this.circuit.removeWire(this.connection.wire);
    this.wires.splice(this.wires.indexOf(this.connection), 1);
  }
}


/** @implements {Command} */
export class RemoveWireCommand {
  constructor(circuit, wires, wireInfo, wireDependents, nodeMap, busMap) {
    this.circuit = circuit;
    this.wires = wires;
    this.wireInfo = wireInfo;
    this.wireDependents = wireDependents;
    this.nodeMap = nodeMap;
    this.busMap = busMap;
  }

  do() {
    const children = this.wireDependents.get(this.wireInfo) ?? [];
    this.childrenSnapshot = reparentDependents(
      this.wireInfo,
      children,
      this.wireDependents,
      this.nodeMap,
      this.busMap,
    );
    this.wireDependents.delete(this.wireInfo);
    this.circuit.removeWire(this.wireInfo.wire);
    this.wires.splice(this.wires.indexOf(this.wireInfo), 1);
    return true;
  }

  undo() {
    const fromGate = this.wireInfo.wire.from;
    const toGate = this.wireInfo.wire.to;
    const inputIndex = this.wireInfo.wire.toInputIndex;
    const outputIndex = this.wireInfo.wire.fromOutputIndex;

    const result = this.circuit.connectToGate(fromGate, toGate, inputIndex, outputIndex);
    if (!result.ok) return;

    this.wireInfo.wire = result.wire;
    this.wires.push(this.wireInfo);

    this.wireDependents.set(this.wireInfo, new Set());

    restoreDependents(this.wireInfo, this.childrenSnapshot, this.wireDependents);
  }
}


/** @implements {Command} */
export class MoveNodeCommand {
  constructor(node, fromX, fromY, toX, toY) {
    this.node = node;
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
  }

  do() {
    this.node.x = this.toX;
    this.node.y = this.toY;
    return true;
  }

  undo() {
    this.node.x = this.fromX;
    this.node.y = this.fromY;
  }
}


/** @implements {Command} */
export class PlaceBusCommand {
  constructor(circuit, busNodes, ghostBus, busMap) {
    this.circuit = circuit;
    this.busNodes = busNodes;
    this.ghostBus = ghostBus;
    this.busMap = busMap;
  }

  do() {
    this.ghostBus.endPointPlaced = true;
    this.circuit.registerBus(this.ghostBus.bus);
    this.busNodes.push(this.ghostBus);
    rebuildBusMap(this.busNodes, this.busMap);
    return true;
  }

  undo() {
    const busIndex = this.busNodes.indexOf(this.ghostBus);
    const busId = this.ghostBus.bus.id;

    this.circuit.removeBus(busId);
    this.busNodes.splice(busIndex, 1);

    rebuildBusMap(this.busNodes, this.busMap);
  }
}


/** @implements {Command} */
export class ChangeWaypointCommand {
  constructor(waypointSnapshot, waypointRef) {
    this.waypointSnapshot = waypointSnapshot;
    this.fromWaypoint = this.waypointSnapshot.fromWaypoint;
    this.toWaypoint = this.waypointSnapshot.toWaypoint;
    this.waypointRef = waypointRef;
    this.liveWaypoint = this.waypointRef.source.waypoints[this.waypointRef.waypointIndex];
  }

  do() {
    this.liveWaypoint.x = this.toWaypoint.x;
    this.liveWaypoint.y = this.toWaypoint.y;
    return true;
  }

  undo() {
    this.liveWaypoint.x = this.fromWaypoint.x;
    this.liveWaypoint.y = this.fromWaypoint.y;
  }
}


/** @implements {Command} */
export class AddWaypointCommand {
  constructor(source, index, newWaypointPosition) {
    this.source = source;
    this.index = index;
    this.newWaypointPosition = newWaypointPosition;
  }

  do() {
    this.source.waypoints = [
      ...this.source.waypoints.slice(0, this.index),
      this.newWaypointPosition,
      ...this.source.waypoints.slice(this.index),
    ];
    return true;
  }

  undo() {
    this.source.waypoints.splice(this.index, 1);
  }
}


/** @implements {Command} */
export class CompositeCommand {
  constructor(commands) {
    this.commands = commands;
  }

  do() {
    const done = [];
    for (const command of this.commands) {
      if (!command.do()) {
        for (let i = done.length - 1; i >= 0; i--) {
          done[i].undo();
        }
        return false;
      }
      done.push(command);
    }
    return true;
  }

  undo() {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}


function reparentDependents(parent, children, wireDependents, nodeMap, busMap) {
  const childrenSnapshot = [];
  for (const child of children) {
    const snapEntry = {
      child,
      originalWaypoints: [...child.waypoints],
      originalSource: child.source,
      originalIsWireBranch: child.isWireBranch,
      reParentedTo: null,
      prependedCount: 0,
    };
    childrenSnapshot.push(snapEntry);

    const childOffset = child.source.tapRef.segmentIndex;
    const parentPrefix = parent.waypoints.slice(0, childOffset);
    const branchPoint = getTapPointFromElement(
      child.source.conn,
      child.source.tapRef,
      nodeMap,
      busMap,
    );

    if (parent.isWireBranch && parent.source) {
      // Parent is itself a branch, re-parent child to grandparent
      const grandparent = parent.source.conn;
      const startPoint = getTapPointFromElement(
        grandparent,
        parent.source.tapRef,
        nodeMap,
        busMap,
      );
      child.waypoints = [startPoint, ...parentPrefix, branchPoint, ...child.waypoints];
      child.source = { conn: grandparent, tapRef: { ...parent.source.tapRef } };

      if (!wireDependents.has(grandparent)) {
        wireDependents.set(grandparent, new Set());
      }
      wireDependents.get(grandparent).add(child);
      snapEntry.reParentedTo = grandparent;
      snapEntry.prependedCount = childOffset + 2;
    } else {
      // Parent is standalone, flatten child
      child.waypoints = [...parentPrefix, branchPoint, ...child.waypoints];
      child.isWireBranch = false;
      child.source = null;
      snapEntry.prependedCount = childOffset + 1;
    }

    if (
      parent instanceof BusConnectionView &&
      parent.direction === "out" &&
      parent.tapRef
    ) {
      snapEntry.originalTapRef = child.tapRef;
      child.tapRef = parent.tapRef;
    }

    const grandChildren = wireDependents.get(child) ?? [];
    for (const grandChild of grandChildren) {
      grandChild.source.tapRef.segmentIndex += snapEntry.prependedCount;
    }
  }
  return childrenSnapshot;
}


function restoreDependents(parent, childrenSnapshot, wireDependents) {
  for (const snap of childrenSnapshot) {
    if (snap.reParentedTo) {
      const gpSet = wireDependents.get(snap.reParentedTo);
      if (gpSet) gpSet.delete(snap.child);
    }

    if (snap.originalTapRef) {
      snap.child.tapRef = snap.originalTapRef;
    }

    snap.child.waypoints = snap.originalWaypoints;
    snap.child.source = snap.originalSource;
    snap.child.isWireBranch = snap.originalIsWireBranch;

    if (!wireDependents.has(parent)) {
      wireDependents.set(parent, new Set());
    }
    wireDependents.get(parent).add(snap.child);

    const grandChildren = wireDependents.get(snap.child) ?? [];
    for (const grandChild of grandChildren) {
      grandChild.source.tapRef.segmentIndex -= snap.prependedCount;
    }
  }
}