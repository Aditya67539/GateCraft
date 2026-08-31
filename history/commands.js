import { rebuildNodeMap } from "../render/RenderPoint.js";
import { initWire } from "../render/wireGeometry.js";
import { showToast } from "../ui/toast.js";

/**
 * @typedef {Object} Command
 * @property {function(): boolean} do - Applies the change. Returns true if
 *   the change was applied, false if it was rejected (e.g. failed validation).
 *   A false return means the command must NOT be pushed onto the undo stack. 
 * @property {function(): boolean} undo - Reverses a change previously applied
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