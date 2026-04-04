export class Wire {
  constructor(from, to, toInputIndex, fromOutputIndex = null) {
    this.from = from;
    this.to = to;
    this.toInputIndex = toInputIndex;
    this.fromOutputIndex = fromOutputIndex;
    this.signal = fromOutputIndex !== null ? from.output[fromOutputIndex] : from.output;
  }
}