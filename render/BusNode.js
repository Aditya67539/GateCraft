import { state } from "../state.js";
import { createBasicGate } from "../logic/gates.js";

export class BusNode {
  constructor(bus, startPoint, endPoint) {
    this.bus = bus;
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.waypoints = null;
    this.startPointPlaced = false;
    this.endPointPlaced = false;
  }
}


export function spawnBusNode(mouseX, mouseY) {
  state.ghostBus = createBusNode(mouseX, mouseY);
  state.mode = "placing";
}


function createBusNode(mouseX, mouseY) {
  const bus = createBasicGate("bus");
  return new BusNode(bus, { x: mouseX, y: mouseY }, { x: mouseX, y: mouseY });
}