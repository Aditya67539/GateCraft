class Input {
  constructor(value) {
    this.output = value;
  }

  setValue(newValue) {
    this.output = newValue;
  }

  evaluate() {
    return this.output;
  }
}

class Gate {
  static nextId = 1;
  constructor(type, inputs) {
    this.id = Gate.nextId++;
    this.type = type.toLowerCase();
    this.inputs = inputs;
    this.output = false;
  }

  evaluate() {
    const resolvedInputs = this.inputs.map(input => {
      if (input instanceof Wire) {
        return input.from.evaluate();
      }
    });
    switch(this.type) {
      case "and":
        this.output = true;
        resolvedInputs.forEach(input => {
          this.output = this.output && input;
        });
        break;
      case "or":
        this.output = false;
        resolvedInputs.forEach(input => {
          this.output = this.output || input;
        });
        break;
      case "not":
        if (resolvedInputs.length !== 1) {
          console.error("Not operator does not support multiple inputs!");
        }
        this.output = !resolvedInputs[0];
        break;
      case "nand":
        this.output = true;
        resolvedInputs.forEach(input => {
          this.output = this.output && input;
        });
        this.output = !this.output;
        break;
      case "nor":
        this.output = false;
        resolvedInputs.forEach(input => {
          this.output = this.output || input;
        });
        this.output = !this.output;
        break;
      case "xor":
        let countXOR = 0;
        resolvedInputs.forEach(input => {
          if (input) countXOR += 1;
        });
        this.output = countXOR % 2 ? true : false;
        break;
      case "xnor":
        let countXNOR = 0;
        resolvedInputs.forEach(input => {
          if (input) countXNOR += 1;
        });
        this.output = countXNOR % 2 ? false : true;
        break;
      default:
        console.error("Invalid operation");
    }
    return this.output;
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


const gate1 = new Gate("xor", []);
gate1.connect(new Input(false));
gate1.connect(new Input(false));
gate1.connect(new Input(false));
gate1.connect(new Input(false));

gate1.evaluate();
console.log(gate1.output);