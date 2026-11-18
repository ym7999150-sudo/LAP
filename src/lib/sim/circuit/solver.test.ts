import { describe, expect, it } from "vitest";
import { solveDense } from "./linalg";
import { simulateCircuit, WIRE_RESISTANCE } from "./solver";
import { CircuitBuilder } from "./testkit";

const close = (a: number, b: number, rel = 1e-3) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.abs(b) * rel + 1e-6);

/** Battery with near-zero internal resistance to compare with ideal textbook values. */
function idealBattery(c: CircuitBuilder, v = 12) {
  return c.add("battery", { voltage: v, internalResistance: 0.01 });
}

describe("linear algebra", () => {
  it("solves a 2x2 system", () => {
    const r = solveDense([Float64Array.from([2, 1]), Float64Array.from([1, 3])], Float64Array.from([3, 5]));
    expect(r.ok).toBe(true);
    if (r.ok) {
      close(r.x[0]!, 0.8);
      close(r.x[1]!, 1.4);
    }
  });
  it("detects singular matrices", () => {
    const r = solveDense([Float64Array.from([1, 2]), Float64Array.from([2, 4])], Float64Array.from([1, 2]));
    expect(r.ok).toBe(false);
  });
});

describe("Ohm's law", () => {
  it("I = V / R for a single resistor", () => {
    const c = new CircuitBuilder();
    const b = idealBattery(c, 12);
    const r = c.add("resistor", { resistance: 100 });
    c.wire(`${b}.pos`, `${r}.a`);
    c.wire(`${r}.b`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    expect(res.ok).toBe(true);
    expect(res.closedCircuit).toBe(true);
    const total = 100 + 0.01 + 2 * WIRE_RESISTANCE;
    close(res.components[r]!.current, 12 / total);
    close(res.components[r]!.voltage, (12 * 100) / total);
    close(res.components[r]!.power, (12 / total) ** 2 * 100);
  });

  it("accounts for internal resistance (terminal voltage drop)", () => {
    const c = new CircuitBuilder();
    const b = c.add("battery", { voltage: 9, internalResistance: 1 });
    const r = c.add("resistor", { resistance: 8 });
    c.wire(`${b}.pos`, `${r}.a`);
    c.wire(`${r}.b`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    close(res.components[b]!.current, 9 / (9 + 2 * WIRE_RESISTANCE));
    close(res.components[b]!.voltage, 8, 1e-3);
  });
});

describe("series and parallel", () => {
  it("series resistances add", () => {
    const c = new CircuitBuilder();
    const b = idealBattery(c, 10);
    const r1 = c.add("resistor", { resistance: 30 });
    const r2 = c.add("resistor", { resistance: 70 });
    c.wire(`${b}.pos`, `${r1}.a`);
    c.wire(`${r1}.b`, `${r2}.a`);
    c.wire(`${r2}.b`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    close(res.components[r1]!.current, 0.1, 1e-3);
    close(res.components[r2]!.current, 0.1, 1e-3);
    // voltage divider
    close(res.components[r1]!.voltage, 3, 1e-3);
    close(res.components[r2]!.voltage, 7, 1e-3);
  });

  it("parallel resistances combine reciprocally and currents divide", () => {
    const c = new CircuitBuilder();
    const b = idealBattery(c, 12);
    const r1 = c.add("resistor", { resistance: 60 });
    const r2 = c.add("resistor", { resistance: 30 });
    c.wire(`${b}.pos`, `${r1}.a`);
    c.wire(`${b}.pos`, `${r2}.a`);
    c.wire(`${r1}.b`, `${b}.neg`);
    c.wire(`${r2}.b`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    close(res.components[r1]!.current, 0.2, 2e-3);
    close(res.components[r2]!.current, 0.4, 2e-3);
    close(res.components[b]!.current, 0.6, 2e-3); // R_eq = 20 Ω
  });

  it("satisfies KCL at every node and KVL around the loop", () => {
    const c = new CircuitBuilder();
    const b = idealBattery(c, 9);
    const r1 = c.add("resistor", { resistance: 10 });
    const r2 = c.add("resistor", { resistance: 20 });
    const r3 = c.add("resistor", { resistance: 30 });
    c.wire(`${b}.pos`, `${r1}.a`);
    c.wire(`${r1}.b`, `${r2}.a`);
    c.wire(`${r1}.b`, `${r3}.a`);
    c.wire(`${r2}.b`, `${b}.neg`);
    c.wire(`${r3}.b`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    const i1 = res.components[r1]!.current;
    const i2 = res.components[r2]!.current;
    const i3 = res.components[r3]!.current;
    close(i1, i2 + i3, 1e-6);
    close(res.components[r2]!.voltage, res.components[r3]!.voltage, 1e-3); // wires are 1 mΩ, so tiny drops differ by path
    const loop = res.components[r1]!.voltage + res.components[r2]!.voltage;
    expect(Math.abs(loop - res.components[b]!.voltage)).toBeLessThan(1e-3);
  });
});

describe("switches, open and short circuits", () => {
  function lampCircuit(closed: boolean) {
    const c = new CircuitBuilder();
    const b = c.add("battery", { voltage: 6, internalResistance: 0.2 });
    const s = c.add("switch", { closed });
    const l = c.add("bulb", { ratedVoltage: 6, ratedPower: 3 });
    c.wire(`${b}.pos`, `${s}.a`);
    c.wire(`${s}.b`, `${l}.a`);
    c.wire(`${l}.b`, `${b}.neg`);
    return { c, b, s, l };
  }

  it("open switch: no current, bulb off, open-circuit reported", () => {
    const { c, l } = lampCircuit(false);
    const res = simulateCircuit(c.doc);
    expect(Math.abs(res.components[l]!.current)).toBeLessThan(1e-9);
    expect(res.components[l]!.state).toBe("off");
    expect(res.closedCircuit).toBe(false);
    expect(res.issues.some((i) => i.code === "open-circuit")).toBe(true);
    expect(Object.values(res.wires).every((w) => !w.conducting)).toBe(true);
  });

  it("closed switch lights the bulb near rated power", () => {
    const { c, l } = lampCircuit(true);
    const res = simulateCircuit(c.doc);
    expect(res.closedCircuit).toBe(true);
    expect(res.components[l]!.state).toBe("on");
    // R = 12 Ω, total ≈ 12.2 Ω → P ≈ 2.9 W
    close(res.components[l]!.power, (6 / 12.203) ** 2 * 12, 2e-3);
    expect(res.components[l]!.activity!).toBeGreaterThan(0.9);
    expect(Object.values(res.wires).every((w) => w.conducting)).toBe(true);
  });

  it("detects a short circuit across the battery", () => {
    const c = new CircuitBuilder();
    const b = c.add("battery", { voltage: 9, internalResistance: 0.5 });
    c.wire(`${b}.pos`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    expect(res.issues.some((i) => i.code === "short-circuit")).toBe(true);
    expect(res.closedCircuit).toBe(false);
    close(res.components[b]!.current, 9 / (0.5 + WIRE_RESISTANCE), 1e-3);
  });

  it("a bulb bypassed by a wire receives (almost) no power", () => {
    const c = new CircuitBuilder();
    const b = c.add("battery", { voltage: 6, internalResistance: 0.2 });
    const r = c.add("resistor", { resistance: 10 });
    const l = c.add("bulb");
    c.wire(`${b}.pos`, `${r}.a`);
    c.wire(`${r}.b`, `${l}.a`);
    c.wire(`${l}.b`, `${b}.neg`);
    c.wire(`${l}.a`, `${l}.b`); // bypass
    const res = simulateCircuit(c.doc);
    expect(res.components[l]!.power).toBeLessThan(1e-3);
  });
});

describe("disconnected and invalid configurations", () => {
  it("reports disconnected and partially connected components", () => {
    const c = new CircuitBuilder();
    const b = c.add("battery");
    const r = c.add("resistor");
    c.add("bulb");
    c.wire(`${b}.pos`, `${r}.a`);
    const res = simulateCircuit(c.doc);
    expect(res.ok).toBe(true);
    expect(res.issues.some((i) => i.code === "disconnected")).toBe(true);
    expect(res.issues.some((i) => i.code === "partially-connected")).toBe(true);
    expect(res.closedCircuit).toBe(false);
  });

  it("flags unsupported components and treats them as open", () => {
    const c = new CircuitBuilder();
    const b = c.add("battery");
    const q = c.add("npn-transistor");
    c.wire(`${b}.pos`, `${q}.p1`);
    c.wire(`${q}.p3`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    expect(res.issues.some((i) => i.code === "unsupported-component")).toBe(true);
    expect(res.closedCircuit).toBe(false);
  });

  it("handles an empty scene and a circuit with no source", () => {
    expect(simulateCircuit(new CircuitBuilder().doc).ok).toBe(true);
    const c = new CircuitBuilder();
    const r1 = c.add("resistor");
    const r2 = c.add("resistor");
    c.wire(`${r1}.a`, `${r2}.a`);
    c.wire(`${r1}.b`, `${r2}.b`);
    const res = simulateCircuit(c.doc);
    expect(res.ok).toBe(true);
    expect(res.issues.some((i) => i.code === "no-source")).toBe(true);
    expect(Math.abs(res.components[r1]!.current)).toBeLessThan(1e-12);
  });

  it("stays stable with extreme resistance ratios", () => {
    const c = new CircuitBuilder();
    const b = idealBattery(c, 5);
    const big = c.add("resistor", { resistance: 1_000_000 });
    const tiny = c.add("resistor", { resistance: 0.1 });
    c.wire(`${b}.pos`, `${big}.a`);
    c.wire(`${big}.b`, `${tiny}.a`);
    c.wire(`${tiny}.b`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    expect(res.ok).toBe(true);
    close(res.components[big]!.current, 5e-6, 1e-3);
    expect(Number.isFinite(res.components[tiny]!.voltage)).toBe(true);
  });
});

describe("meters", () => {
  it("ammeter in series and voltmeter in parallel read correctly", () => {
    const c = new CircuitBuilder();
    const b = idealBattery(c, 12);
    const a = c.add("ammeter");
    const r = c.add("resistor", { resistance: 120 });
    const v = c.add("voltmeter");
    c.wire(`${b}.pos`, `${a}.pos`);
    c.wire(`${a}.neg`, `${r}.a`);
    c.wire(`${r}.b`, `${b}.neg`);
    c.wire(`${v}.pos`, `${r}.a`);
    c.wire(`${v}.neg`, `${r}.b`);
    const res = simulateCircuit(c.doc);
    close(res.components[a]!.reading!, 0.1, 2e-3);
    close(res.components[v]!.reading!, 12, 2e-3);
  });

  it("ohmmeter measures equivalent resistance of an unpowered network", () => {
    const c = new CircuitBuilder();
    const o = c.add("ohmmeter");
    const r1 = c.add("resistor", { resistance: 100 });
    const r2 = c.add("resistor", { resistance: 100 });
    c.wire(`${o}.pos`, `${r1}.a`);
    c.wire(`${o}.pos`, `${r2}.a`);
    c.wire(`${o}.neg`, `${r1}.b`);
    c.wire(`${o}.neg`, `${r2}.b`);
    const res = simulateCircuit(c.doc);
    close(res.components[o]!.reading!, 50, 1e-3);
  });

  it("ohmmeter shows overload (null) on an open circuit", () => {
    const c = new CircuitBuilder();
    const o = c.add("ohmmeter");
    const r = c.add("resistor");
    c.wire(`${o}.pos`, `${r}.a`);
    const res = simulateCircuit(c.doc);
    expect(res.components[o]!.reading).toBeNull();
  });

  it("multimeter switches modes", () => {
    const c = new CircuitBuilder();
    const b = idealBattery(c, 6);
    const m = c.add("multimeter", { mode: "voltmeter" });
    c.wire(`${m}.pos`, `${b}.pos`);
    c.wire(`${m}.neg`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    close(res.components[m]!.reading!, 6, 1e-3);
    c.set(m, "mode", "ammeter");
    const res2 = simulateCircuit(c.doc);
    expect(res2.issues.some((i) => i.code === "short-circuit")).toBe(true);
  });
});

describe("nonlinear and protective devices", () => {
  it("LED conducts forward with Vf drop and blocks reverse", () => {
    const c = new CircuitBuilder();
    const b = idealBattery(c, 5);
    const r = c.add("resistor", { resistance: 150 });
    const d = c.add("led", { color: "red" });
    c.wire(`${b}.pos`, `${r}.a`);
    c.wire(`${r}.b`, `${d}.anode`);
    c.wire(`${d}.cathode`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    expect(res.components[d]!.state).toBe("on");
    close(res.components[d]!.current, (5 - 1.8) / 160, 5e-3);

    const c2 = new CircuitBuilder();
    const b2 = idealBattery(c2, 5);
    const r2 = c2.add("resistor", { resistance: 150 });
    const d2 = c2.add("led");
    c2.wire(`${b2}.pos`, `${r2}.a`);
    c2.wire(`${r2}.b`, `${d2}.cathode`);
    c2.wire(`${d2}.anode`, `${b2}.neg`);
    const res2 = simulateCircuit(c2.doc);
    expect(res2.components[d2]!.state).toBe("off");
    expect(Math.abs(res2.components[d2]!.current)).toBeLessThan(1e-6);
    expect(res2.issues.some((i) => i.code === "led-reverse")).toBe(true);
  });

  it("fuse blows on over-current and opens the circuit", () => {
    const c = new CircuitBuilder();
    const b = c.add("battery", { voltage: 12, internalResistance: 0.1 });
    const f = c.add("fuse", { rating: 0.5 });
    const r = c.add("resistor", { resistance: 4 });
    c.wire(`${b}.pos`, `${f}.a`);
    c.wire(`${f}.b`, `${r}.a`);
    c.wire(`${r}.b`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    expect(res.blownFuses).toContain(f);
    expect(res.components[f]!.state).toBe("blown");
    expect(Math.abs(res.components[r]!.current)).toBeLessThan(1e-6);
  });

  it("capacitor blocks DC in steady state", () => {
    const c = new CircuitBuilder();
    const b = idealBattery(c, 9);
    const cap = c.add("capacitor");
    const r = c.add("resistor");
    c.wire(`${b}.pos`, `${r}.a`);
    c.wire(`${r}.b`, `${cap}.a`);
    c.wire(`${cap}.b`, `${b}.neg`);
    const res = simulateCircuit(c.doc);
    expect(Math.abs(res.components[r]!.current)).toBeLessThan(1e-6);
    close(res.components[cap]!.voltage, 9, 1e-3);
  });

  it("electromagnet field grows with current and turns", () => {
    const run = (turns: number, v: number) => {
      const c = new CircuitBuilder();
      const b = idealBattery(c, v);
      const e = c.add("electromagnet", { turns, resistance: 4 });
      c.wire(`${b}.pos`, `${e}.a`);
      c.wire(`${e}.b`, `${b}.neg`);
      return simulateCircuit(c.doc).components[e]!.fieldT!;
    };
    close(run(400, 6) / run(200, 6), 2, 1e-6);
    close(run(200, 12) / run(200, 6), 2, 1e-3);
  });

  it("insulators block current, conductors pass it", () => {
    const run = (material: string) => {
      const c = new CircuitBuilder();
      const b = c.add("battery", { voltage: 6 });
      const s = c.add("conductivity-tester", { material });
      const l = c.add("bulb");
      c.wire(`${b}.pos`, `${s}.a`);
      c.wire(`${s}.b`, `${l}.a`);
      c.wire(`${l}.b`, `${b}.neg`);
      return simulateCircuit(c.doc).components[l]!.state;
    };
    expect(run("copper")).toBe("on");
    expect(run("graphite")).toBe("on");
    expect(run("plastic")).toBe("off");
    expect(run("glass")).toBe("off");
  });
});
