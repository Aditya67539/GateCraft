export class Wire {
  constructor(from, to, toInputIndex) {
    this.from = from;
    this.to = to;
    this.toInputIndex = toInputIndex;
    this.signal = from.output;
  }
}