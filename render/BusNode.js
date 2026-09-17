import { state } from "../state.js";
import { createBasicGate } from "../logic/gates.js";

export class BusNode {
  constructor(bus, startPoint, endPoint) {
    this.bus = bus;
    this.startPoint = startPoint;
    this.endPoint = endPoint;
    this.waypoints = [];
    this.startPointPlaced = false;
    this.endPointPlaced = false;
  }

  getTapPoint(tapRef) {
    const points = [this.startPoint, ...this.waypoints, this.endPoint];
    const A = points[tapRef.segmentIndex];
    const B = points[tapRef.segmentIndex + 1];
    return {
      x: A.x + tapRef.t * (B.x - A.x),
      y: A.y + tapRef.t * (B.y - A.y),
    };
  }

  getPoints() {
    return {
      start: this.startPoint,
      waypoints: this.waypoints,
      end: this.endPoint,
    }
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

export function rebuildBusMap(busNodes, busMap) {
  busMap.clear();

  for (const busNode of busNodes) {
    busMap.set(busNode.bus.id, busNode);
  }
}