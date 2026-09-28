import { rebuildBusMap } from "../render/BusNode.js";
import { rebuildNodeMap } from "../render/RenderPoint.js";
import { BusConnection, initWire, WireConnection } from "../render/wireGeometry.js";
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

      const result = this.circuit.connectToGate(fromGate, toGate, inputIndex, outputIndex);
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
export class RemoveBusCommand {
  constructor(busNodes, wires, circuit, busNode, busMap) {
    this.busNodes = busNodes;
    this.wires = wires;
    this.circuit = circuit;
    this.busNode = busNode;
    this.busMap = busMap;
  }

  do() {
    const busIndex = this.busNodes.indexOf(this.busNode);
    const busId = this.busNode.bus.id;

    const wiresToRemove = this.wires.filter(n => n.wire.from.id === busId || n.wire.to.id === busId);
    
    this.circuit.removeBus(busId);
    this.busNodes.splice(busIndex, 1);

    wiresToRemove.forEach(w => this.wires.splice(this.wires.indexOf(w), 1));

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

    rebuildBusMap(this.busNodes, this.busMap);
  }
}


/** @implements {Command} */
export class ConnectGateCommand {
  constructor(circuit, fromGate, toGate, inputIndex, outputIndex, ghostWire, wires) {
    this.circuit = circuit;
    this.fromGate = fromGate;
    this.toGate = toGate;
    this.inputIndex = inputIndex;
    this.outputIndex = outputIndex;
    this.ghostWire = ghostWire;
    this.wires = wires;
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
      this.connection = new WireConnection(initWire(wire, this.ghostWire));
    }
    this.wires.push(this.connection);
    return true;
  }

  undo() {
    this.circuit.removeWire(this.connection.wire);
    this.wires.splice(this.wires.indexOf(this.connection), 1);
  }
}


/** @implements {Command} */
export class BusConnectionCommand {
  constructor(circuit, gate, bus, ghostWire, wires, direction, index, tapRef) {
    this.circuit = circuit;
    this.gate = gate;
    this.bus = bus;
    this.ghostWire = ghostWire;
    this.wires = wires;
    this.direction = direction;
    this.index = index;
    this.tapRef = tapRef;
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
      const wireInfo = initWire(wire, this.ghostWire);
      wireInfo.tapRef = this.tapRef;
      this.connection = new BusConnection(
        wireInfo,
        this.bus.id,
        this.gate.id,
        this.index,
        this.direction,
      );
    }

    this.wires.push(this.connection);
    return true;
  }

  undo() {
    this.circuit.removeWire(this.connection.wire);
    this.wires.splice(this.wires.indexOf(this.connection), 1);
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

    const result = this.circuit.connectToGate(fromGate, toGate, inputIndex, outputIndex);
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
  constructor(waypointSnapshot, changingWaypoint) {
    this.waypointSnapshot = waypointSnapshot;
    this.fromWaypoint = this.waypointSnapshot.fromWaypoint;
    this.toWaypoint = this.waypointSnapshot.toWaypoint;
    this.liveWaypoint = changingWaypoint;
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