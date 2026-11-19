import { GATE_CATEGORIES } from "../constants.js";

class Logic {
  static nextId = 1;
}

export class Wire {
  constructor(from, to, toInputIndex, fromOutputIndex = null) {
    this.id = Logic.nextId++;
    this.from = from;
    this.to = to;
    this.toInputIndex = toInputIndex;
    this.fromOutputIndex = fromOutputIndex;
    this.signal = fromOutputIndex !== null && Array.isArray(from.output)
      ? from.output[fromOutputIndex]
      : from.output;
  }
}

export function isConnectionPossible(circuit, originInfo, destinationInfo) {
  const { originType, origin } = originInfo;
  const { destinationType, destination } = destinationInfo;
  let from, to, fromOutputIndex = null, toInputIndex = null;

  if (!isValidOrigin(originType, origin)) return false;
  if (!isValidDestination(destinationType, destination)) return false;

  if (originType === "gate") {
    from = origin.fromNode.gate;
    fromOutputIndex = origin.fromOutputIndex;
  } else if (originType === "wire") {
    from = origin.conn.wire.from;
    fromOutputIndex = origin.conn.wire.fromOutputIndex;
  } else if (originType === "bus") {
    from = origin.busNode.bus;
  }

  if (destinationType === "gate") {
    to = destination.toNode.gate;
    toInputIndex = destination.index;
  } else if (destinationType === "bus") {
    to = destination.busNode.bus;
  }

  if (
    (
      originType === "bus" ||
      (from.category === GATE_CATEGORIES.PRIMITIVE && from.type === "bus")
    ) &&
    destinationType === "bus"
  ) return false;

  return circuit.canConnect(from, to, fromOutputIndex, toInputIndex);
}

function isValidOrigin(type, origin) {
  if (!origin) return false;

  switch (type) {
    case "gate":
      return (
        Object.hasOwn(origin, "fromNode") &&
        Object.hasOwn(origin, "fromOutputIndex") &&
        Object.hasOwn(origin.fromNode, "gate")
      );

    case "wire":
      return (
        Object.hasOwn(origin, "conn") &&
        Object.hasOwn(origin.conn, "wire") &&
        Object.hasOwn(origin.conn.wire, "from") &&
        Object.hasOwn(origin.conn.wire, "fromOutputIndex")
      );

    case "bus":
      return (
        Object.hasOwn(origin, "busNode") &&
        Object.hasOwn(origin.busNode, "bus")
      );

    default:
      return false;
  }
}


function isValidDestination(type, destination) {
  if (!destination) return false;

  switch (type) {
    case "gate":
      return (
        Object.hasOwn(destination, "toNode") &&
        Object.hasOwn(destination, "index") &&
        Object.hasOwn(destination.toNode, "gate")
      );

    case "bus":
      return (
        Object.hasOwn(destination, "busNode") &&
        Object.hasOwn(destination.busNode, "bus")
      );
    
    default:
      return false;
  }
}