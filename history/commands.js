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
  }

  do() {
    const result = this.circuit.connectGates(this.fromGate, this.toGate, this.inputIndex, this.outputIndex);
    if (!result.ok) {
      showToast(result.error, { type: "error" });
      return false;
    }
    let wire = result.wire;
    this.wireInfo = initWire(this.renderNodes, wire, this.ghostWire, this.nodeMap);
    this.wires.push(this.wireInfo);
    return true;
  }

  undo() {
    this.circuit.removeWire(this.wireInfo.wire);
    this.wires.splice(this.wires.indexOf(this.wireInfo), 1);
  }
}