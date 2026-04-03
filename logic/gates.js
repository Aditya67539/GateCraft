import { Wire } from "./wire.js";

class Logic {
  static nextId = 1;
}

export class Input {
  constructor(value) {
    this.id = Logic.nextId++;
    this.type = "input";
    this.output = value;
  }

  setValue(newValue) {
    this.output = newValue;
  }

  evaluate() {
    return this.output;
  }
}

export class Clock extends Input {
  constructor(value) {
    super(value);
    this.type = "clock";
  }

  tick() {
    super.setValue(!this.output);
  }
}

class ConnectableGate {
  connect(fromGate, index = null) {
    if (!index) {
      index = this.inputs.length;
    }
    const wire = new Wire(fromGate, this, index);
    this.inputs[index] = wire;
    return wire;
  }
}

export class Output extends ConnectableGate {
  constructor() {
    super();
    this.id = Logic.nextId++;
    this.type = "output";
    this.inputs = [];
    this.output = false;
    this.tempOutput = false;
  }

  evaluate() {
    if (this.inputs) {
      if (this.inputs.length > 1) {
        console.error("Output does not support multiple inputs!");
        return false;
      } else if (this.inputs.length === 0) {
        console.error("No input connected!");
        return false;
      }
    }
    this.tempOutput = this.inputs[0].signal;
    return this.tempOutput;
  }
}

export class Gate extends ConnectableGate {
  constructor(type, inputs) {
    super();
    this.id = Logic.nextId++;
    this.type = type.toLowerCase();
    this.inputs = inputs;
    this.output = false;
    this.tempOutput = false;
  }

  evaluate() {
    const resolvedInputs = this.inputs.map(input => {
      if (input instanceof Wire) {
        return input.signal;
      }
    });
    switch(this.type) {
      case "and":
        this.tempOutput = true;
        resolvedInputs.forEach(input => {
          this.tempOutput = this.tempOutput && input;
        });
        break;
      case "or":
        this.tempOutput = false;
        resolvedInputs.forEach(input => {
          this.tempOutput = this.tempOutput || input;
        });
        break;
      case "not":
        if (resolvedInputs.length > 1) {
          console.error("NOT operator does not support multiple inputs!");
          break;
        } else if (resolvedInputs.length === 0) {
          console.error("No input connected!");
          break;
        }
        this.tempOutput = !resolvedInputs[0];
        break;
      case "nand":
        this.tempOutput = true;
        resolvedInputs.forEach(input => {
          this.tempOutput = this.tempOutput && input;
        });
        this.tempOutput = !this.tempOutput;
        break;
      case "nor":
        this.tempOutput = false;
        resolvedInputs.forEach(input => {
          this.tempOutput = this.tempOutput || input;
        });
        this.tempOutput = !this.tempOutput;
        break;
      case "xor":
        let countXOR = 0;
        resolvedInputs.forEach(input => {
          if (input) countXOR += 1;
        });
        this.tempOutput = countXOR % 2 ? true : false;
        break;
      case "xnor":
        let countXNOR = 0;
        resolvedInputs.forEach(input => {
          if (input) countXNOR += 1;
        });
        this.tempOutput = countXNOR % 2 ? false : true;
        break;
      default:
        console.error("Invalid operation");
    }
    return this.tempOutput;
  }
}
