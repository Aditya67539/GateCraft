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