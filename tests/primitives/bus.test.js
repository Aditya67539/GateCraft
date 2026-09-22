import { describe, it, expect } from "vitest";
import { CircuitBuilder } from "../../logic/CircuitBuilder.js";
import { createBasicGate } from "../../logic/gates.js";
import { SIGNAL } from "../../constants.js";

const { LOW, HIGH, X, Z, E } = SIGNAL;

describe("Bus", () => {
  /**
   * Helper: Input → Bus → Output
   * Single driver feeding a bus.
   */
  function buildSingleDriverBus() {
    const builder = new CircuitBuilder();

    const inp = builder.addBasicGate("input");
    const bus = createBasicGate("bus");
    builder.registerBus(bus);
    const out = builder.addBasicGate("output");

    builder.connectToBus(bus, inp);
    builder.connectToGate(bus, out, 0);

    return { builder, inp, bus, out };
  }

  /**
   * Helper: Two inputs → Bus → Output
   * Two drivers feeding the same bus (contention scenarios).
   */
  function buildDualDriverBus() {
    const builder = new CircuitBuilder();

    const inp1 = builder.addBasicGate("input");
    const inp2 = builder.addBasicGate("input");
    const bus = createBasicGate("bus");
    builder.registerBus(bus);
    const out = builder.addBasicGate("output");

    builder.connectToBus(bus, inp1);
    builder.connectToBus(bus, inp2);
    builder.connectToGate(bus, out, 0);

    return { builder, inp1, inp2, bus, out };
  }

  describe("WASM path (builder.evaluate)", () => {
    it("propagates LOW through a bus", () => {
      const { builder, inp, out } = buildSingleDriverBus();

      inp.setValue(LOW);
      builder.evaluate();

      expect(out.output).toBe(LOW);
    });

    it("propagates HIGH through a bus", () => {
      const { builder, inp, out } = buildSingleDriverBus();

      inp.setValue(HIGH);
      builder.evaluate();

      expect(out.output).toBe(HIGH);
    });

    it("transitions between LOW and HIGH", () => {
      const { builder, inp, out } = buildSingleDriverBus();

      inp.setValue(LOW);
      builder.evaluate();
      expect(out.output).toBe(LOW);

      inp.setValue(HIGH);
      builder.evaluate();
      expect(out.output).toBe(HIGH);

      inp.setValue(LOW);
      builder.evaluate();
      expect(out.output).toBe(LOW);
    });

    it("resolves two agreeing drivers (both LOW)", () => {
      const { builder, inp1, inp2, out } = buildDualDriverBus();

      inp1.setValue(LOW);
      inp2.setValue(LOW);
      builder.evaluate();

      expect(out.output).toBe(LOW);
    });

    it("resolves two agreeing drivers (both HIGH)", () => {
      const { builder, inp1, inp2, out } = buildDualDriverBus();

      inp1.setValue(HIGH);
      inp2.setValue(HIGH);
      builder.evaluate();

      expect(out.output).toBe(HIGH);
    });

    it("produces E (error) for conflicting drivers", () => {
      const { builder, inp1, inp2, out } = buildDualDriverBus();

      inp1.setValue(LOW);
      inp2.setValue(HIGH);
      builder.evaluate();

      expect(out.output).toBe(E);
    });

    it("bus with no inputs evaluates to Z", () => {
      const builder = new CircuitBuilder();
      const bus = createBasicGate("bus");
      builder.registerBus(bus);
      const out = builder.addBasicGate("output");
      builder.connectToGate(bus, out, 0);
      
      builder.evaluate();
      expect(out.output).toBe(Z);
    });
  });

  describe("Settle path (builder.settle)", () => {
    it("propagates LOW through a bus", () => {
      const { builder, inp, out } = buildSingleDriverBus();

      inp.setValue(LOW);
      builder.settle();

      expect(out.output).toBe(LOW);
    });

    it("propagates HIGH through a bus", () => {
      const { builder, inp, out } = buildSingleDriverBus();

      inp.setValue(HIGH);
      builder.settle();

      expect(out.output).toBe(HIGH);
    });

    it("resolves conflicting drivers to E", () => {
      const { builder, inp1, inp2, out } = buildDualDriverBus();

      inp1.setValue(LOW);
      inp2.setValue(HIGH);
      builder.settle();

      expect(out.output).toBe(E);
    });
  });

  describe("Tri-state buffer driving a bus", () => {
    /**
     * Two tri-state buffers driving a shared bus:
     *   enable1, data1 → TSB1 ─┐
     *                          ├─→ Bus → Output
     *   enable2, data2 → TSB2 ─┘
     */
    function buildTriStateBusCircuit() {
      const builder = new CircuitBuilder();

      const enable1 = builder.addBasicGate("input");
      const data1 = builder.addBasicGate("input");
      const tsb1 = builder.addBasicGate("Tri-state Buffer");

      const enable2 = builder.addBasicGate("input");
      const data2 = builder.addBasicGate("input");
      const tsb2 = builder.addBasicGate("Tri-state Buffer");

      const bus = createBasicGate("bus");
      builder.registerBus(bus);
      const out = builder.addBasicGate("output");

      builder.connectToGate(enable1, tsb1, 0);
      builder.connectToGate(data1, tsb1, 1);

      builder.connectToGate(enable2, tsb2, 0);
      builder.connectToGate(data2, tsb2, 1);

      builder.connectToBus(bus, tsb1);
      builder.connectToBus(bus, tsb2);
      builder.connectToGate(bus, out, 0);

      return { builder, enable1, data1, enable2, data2, out };
    }

    it("one buffer enabled, one disabled → bus carries the active signal", () => {
      const { builder, enable1, data1, enable2, data2, out } = buildTriStateBusCircuit();

      enable1.setValue(HIGH);
      data1.setValue(HIGH);
      enable2.setValue(LOW);
      data2.setValue(LOW);
      builder.evaluate();

      // TSB1 outputs HIGH, TSB2 outputs Z → bus resolves to HIGH
      expect(out.output).toBe(HIGH);
    });

    it("both buffers disabled → bus is Z", () => {
      const { builder, enable1, enable2, out } = buildTriStateBusCircuit();

      enable1.setValue(LOW);
      enable2.setValue(LOW);
      builder.evaluate();

      // Both TSBs output Z → bus resolves Z ⊕ Z = Z
      expect(out.output).toBe(Z);
    });

    it("both enabled with same value → no contention", () => {
      const { builder, enable1, data1, enable2, data2, out } = buildTriStateBusCircuit();

      enable1.setValue(HIGH);
      data1.setValue(LOW);
      enable2.setValue(HIGH);
      data2.setValue(LOW);
      builder.evaluate();

      // Both TSBs output LOW → bus resolves LOW ⊕ LOW = LOW
      expect(out.output).toBe(LOW);
    });

    it("both enabled with different values → contention error", () => {
      const { builder, enable1, data1, enable2, data2, out } = buildTriStateBusCircuit();

      enable1.setValue(HIGH);
      data1.setValue(HIGH);
      enable2.setValue(HIGH);
      data2.setValue(LOW);
      builder.evaluate();

      // TSB1=HIGH, TSB2=LOW → bus contention → E
      expect(out.output).toBe(E);
    });
  });
});
