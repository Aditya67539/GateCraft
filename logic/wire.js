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
    this.signal = fromOutputIndex !== null ? from.output[fromOutputIndex] : from.output;
  }
}

export function canWireConnectToTarget(circuit, wire, target) {
  if (target === null) return false;
  let from, to, fromOutputIndex = null, toInputIndex = null;

  if (wire.originType === "gate") {
    from = wire.origin.fromNode.gate;
    fromOutputIndex = wire.origin.fromOutputIndex;
  } else if (wire.originType === "wire") {
    from = wire.origin.conn.wire.from;
    fromOutputIndex = wire.origin.conn.wire.fromOutputIndex;
  } else if (wire.originType === "bus") {
    from = wire.origin.busNode.bus;
  }

  if (target.destinationType === "gate") {
    to = target.destination.toNode.gate;
    toInputIndex = target.destination.index;
  } else if (target.destinationType === "bus") {
    to = target.destination.busNode.bus;
  }

  return circuit.canConnect(from, to, fromOutputIndex, toInputIndex);
}