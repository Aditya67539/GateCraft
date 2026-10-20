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

  getPoints() {
    return {
      start: this.startPoint,
      waypoints: this.waypoints,
      end: this.endPoint,
    }
  }

  getStartPointBounds(padding = 4) {
    const r = 8;
    return {
      left:   this.startPoint.x - r - padding,
      right:  this.startPoint.x + r + padding,
      top:    this.startPoint.y - r - padding,
      bottom: this.startPoint.y + r + padding,
    };
  }

  getEndPointBounds(padding = 4) {
    const r = 8;
    return {
      left:   this.endPoint.x - r - padding,
      right:  this.endPoint.x + r + padding,
      top:    this.endPoint.y - r - padding,
      bottom: this.endPoint.y + r + padding,
    };
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