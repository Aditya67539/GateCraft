import { rebuildNodeMap } from "../render/RenderPoint.js";
import { initWire } from "../render/wireGeometry.js";
import { showToast } from "../ui/toast.js";

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
  constructor(renderNodes, wires, circuit, node, nodeMap) {
    this.renderNodes = renderNodes;
    this.wires = wires;
    this.circuit = circuit;
    this.node = node;
    this.nodeMap = nodeMap;
  }

  do() {
    const nodeIndex = this.renderNodes.indexOf(this.node);
    const gateId = this.node.gate.id;

    const wiresToRemove = this.wires.filter(n => n.wire.from.id === gateId || n.wire.to.id === gateId);

    this.circuit.removeGate(gateId);
    this.renderNodes.splice(nodeIndex, 1);
    
    wiresToRemove.forEach(w => this.wires.splice(this.wires.indexOf(w), 1));

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

      const result = this.circuit.connectGates(fromGate, toGate, inputIndex, outputIndex);
      if (!result.ok) {
        showToast(result.error, { type: "error" });
        continue;
      }

      w.wire = result.wire;
      this.wires.push(w);
    }

    rebuildNodeMap(this.renderNodes, this.nodeMap);
  }
}


/** @implements {Command} */
export class ConnectWireCommand {
  constructor(circuit, fromGate, toGate, inputIndex, outputIndex, ghostWire, renderNodes, nodeMap, wires) {
    this.circuit = circuit;
    this.fromGate = fromGate;
    this.toGate = toGate;
    this.inputIndex = inputIndex;
    this.outputIndex = outputIndex;
    this.ghostWire = ghostWire;
    this.renderNodes = renderNodes;
    this.nodeMap = nodeMap;
    this.wires = wires;
    this.wireInfo = null;
  }

  do() {
    const result = this.circuit.connectGates(this.fromGate, this.toGate, this.inputIndex, this.outputIndex);
    if (!result.ok) {
      showToast(result.error, { type: "error" });
      return false;
    }
    let wire = result.wire;

    if (this.wireInfo !== null) {
      this.wireInfo.wire = result.wire;
    } else {
      this.wireInfo = initWire(this.renderNodes, wire, this.ghostWire, this.nodeMap);
    }
    this.wires.push(this.wireInfo);
    return true;
  }

  undo() {
    this.circuit.removeWire(this.wireInfo.wire);
    this.wires.splice(this.wires.indexOf(this.wireInfo), 1);
  }
}


/** @implements {Command} */
export class RemoveWireCommand {
  constructor(circuit, wires, wireInfo) {
    this.circuit = circuit;
    this.wires = wires;
    this.wireInfo = wireInfo;
  }

  do() {
    this.circuit.removeWire(this.wireInfo.wire);
    this.wires.splice(this.wires.indexOf(this.wireInfo), 1);
    return true;
  }

  undo() {
    const fromGate = this.wireInfo.wire.from;
    const toGate = this.wireInfo.wire.to;
    const inputIndex = this.wireInfo.wire.toInputIndex;
    const outputIndex = this.wireInfo.wire.fromOutputIndex;

    const result = this.circuit.connectGates(fromGate, toGate, inputIndex, outputIndex);
    if (!result.ok) return;

    this.wireInfo.wire = result.wire;
    this.wires.push(this.wireInfo);
  }
}


/** @implements {Command} */
export class MoveNodeCommand {
  constructor(node, fromX, fromY, toX, toY, connectedWires, waypointSnapshot) {
    this.node = node;
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
    this.connectedWires = connectedWires;
    this.waypointSnapshot = waypointSnapshot;
  }

  do() {
    this.node.x = this.toX;
    this.node.y = this.toY;
    if (this.connectedWires && this.waypointSnapshot?.toWaypoints) {
      for (let i = 0; i < this.connectedWires.length; i++) {
        this.connectedWires[i].wire.waypoints = this.waypointSnapshot.toWaypoints[i].map(wp => ({ ...wp }));
      }
    }
    return true;
  }

  undo() {
    this.node.x = this.fromX;
    this.node.y = this.fromY;
    if (this.connectedWires && this.waypointSnapshot?.fromWaypoints) {
      for (let i = 0; i < this.connectedWires.length; i++) {
        this.connectedWires[i].wire.waypoints = this.waypointSnapshot.fromWaypoints[i].map(wp => ({ ...wp }));
      }
    }
  }
}


/** @implements {Command} */
export class ChangeWaypointCommand {
  constructor(waypointSnapshot, changingWaypoint) {
    this.waypointSnapshot = waypointSnapshot;
    this.fromWaypoint = this.waypointSnapshot.fromWaypoint;
    this.toWaypoint = this.waypointSnapshot.toWaypoint;
    this.liveWaypoint = changingWaypoint.waypoint;
    this.liveOtherWaypoint = changingWaypoint.otherWaypoint;
  }

  do() {
    this.liveWaypoint.x = this.toWaypoint.waypoint.x;
    this.liveWaypoint.y = this.toWaypoint.waypoint.y;
    if (this.liveOtherWaypoint && this.toWaypoint.otherWaypoint) {
      this.liveOtherWaypoint.x = this.toWaypoint.otherWaypoint.x;
      this.liveOtherWaypoint.y = this.toWaypoint.otherWaypoint.y;
    }
    return true;
  }

  undo() {
    this.liveWaypoint.x = this.fromWaypoint.waypoint.x;
    this.liveWaypoint.y = this.fromWaypoint.waypoint.y;
    if (this.liveOtherWaypoint && this.fromWaypoint.otherWaypoint) {
      this.liveOtherWaypoint.x = this.fromWaypoint.otherWaypoint.x;
      this.liveOtherWaypoint.y = this.fromWaypoint.otherWaypoint.y;
    }
  }
}