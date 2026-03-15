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


gate1 = new Gate("and", []);
gate1.connect(new Input(true));
gate1.connect(new Input(true));
gate2 = new Gate("or", []);
gate2.connect(new Input(false));
gate2.connect(new Input(false));
gate3 = new Gate("or", []);
gate4 = new Gate("and", []);
gate4.connect(new Input(false))
gate5 = new Gate("not", []);

gate3.connect(gate1);
gate3.connect(gate2);
gate4.connect(gate3);
gate5.connect(gate4);

gate5.evaluate();

console.log(gate5.output);