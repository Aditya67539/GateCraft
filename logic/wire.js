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
  } else if (destinationType === "wire") {
    return false;
  }

  return circuit.canConnect(from, to, fromOutputIndex, toInputIndex);
}