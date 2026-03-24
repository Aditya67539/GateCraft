class Logic {
  static nextId = 1;
}

class Input {
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

class Clock extends Input {
  constructor(value) {
    super(value);
    this.type = "clock";
  }

  tick() {
    super.setValue(!this.output);
  }
}

class Output {
  constructor() {
    this.id = Logic.nextId++;
    this.type = "output";
    this.inputs = [];
    this.output = false;
    this.tempOutput = false;
  }

  evaluate() {
    if (!this.inputs || this.inputs.length !== 1) {
      console.error("Output does not support multiple inputs!");
      return false;
    }
    this.tempOutput = this.inputs[0].signal;
    return this.tempOutput;
  }

  connect(fromGate) {
    const index = this.inputs.length;
    const wire = new Wire(fromGate, this, index);
    this.inputs.push(wire);
    return wire;
  }
}

class Gate {
  constructor(type, inputs) {
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
        if (resolvedInputs.length !== 1) {
          console.error("Not operator does not support multiple inputs!");
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

  connect(fromGate) {
    const index = this.inputs.length;
    const wire = new Wire(fromGate, this, index);
    this.inputs.push(wire);
    return wire;
  }
}

class Wire {
  constructor(from, to, toInputIndex) {
    this.from = from;
    this.to = to;
    this.toInputIndex = toInputIndex;
    this.signal = from.output;
  }
}

const MAX_ITER = 3;

function evaluateAll(renderNodes, wires) {
  for (let i = 0; i < wires.length; i++) {
    if (wires[i].wire.from.type === "input" || wires[i].wire.from.type === "clock") {
      wires[i].wire.signal = wires[i].wire.from.output;
    }
  }

  for (let iter_count = 0; iter_count < MAX_ITER; iter_count++) {
    let changed = false;

    for (let i = 0; i < renderNodes.length; i++) {
      const gate = renderNodes[i].gate;
      if (gate.type === "input" || gate.type === "clock") continue;

      const newOutput = gate.evaluate();

      if (newOutput !== gate.output) {
        changed = true;
        gate.output = newOutput;

        for (let j = 0; j < wires.length; j++) {
          if (wires[j].wire.from.id === gate.id) {
            wires[j].wire.signal = newOutput;
          }
        }
      }
    }

    if (!changed) break;
  }
}