"use client";
/**
 * Procedural sound effects synthesised with the Web Audio API.
 * No audio files are downloaded, so there are no licensing or hotlinking issues.
 * Optional recorded CC0 samples can be added later through public/sounds/manifest.json.
 */
import { useSettings } from "./settings";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const loops = new Map<string, { stop: () => void; update?: (v: number) => void }>();

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!useSettings.getState().sound) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  return src;
}

function env(c: AudioContext, g: GainNode, peak: number, attack: number, hold: number, release: number, t0 = c.currentTime) {
  g.gain.cancelScheduledValues(t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
  g.gain.setValueAtTime(Math.max(peak, 0.0002), t0 + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + hold + release);
  return t0 + attack + hold + release;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.2, when = 0, slideTo?: number) {
  const c = ac();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t0 = c.currentTime + when;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  o.connect(g).connect(master);
  const end = env(c, g, vol, 0.005, dur * 0.3, dur * 0.7, t0);
  o.start(t0);
  o.stop(end + 0.05);
}

function burst(opts: { dur: number; vol: number; type: BiquadFilterType; freq: number; q?: number; attack?: number; when?: number; freqTo?: number }) {
  const c = ac();
  if (!c || !master) return;
  const src = noise(c);
  const f = c.createBiquadFilter();
  f.type = opts.type;
  const t0 = c.currentTime + (opts.when ?? 0);
  f.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t0 + opts.dur);
  f.Q.value = opts.q ?? 1;
  const g = c.createGain();
  src.connect(f).connect(g).connect(master);
  const end = env(c, g, opts.vol, opts.attack ?? 0.01, opts.dur * 0.4, opts.dur * 0.6, t0);
  src.start(t0, Math.random());
  src.stop(end + 0.05);
}

export const sfx = {
  click() {
    tone(1800, 0.04, "square", 0.04);
  },
  place() {
    tone(220, 0.09, "sine", 0.16, 0, 140);
    burst({ dur: 0.05, vol: 0.05, type: "bandpass", freq: 2500, q: 2 });
  },
  snap() {
    // Metallic terminal clip: two short high partials.
    tone(2600, 0.05, "triangle", 0.09);
    tone(4100, 0.04, "sine", 0.05, 0.012);
    burst({ dur: 0.04, vol: 0.06, type: "highpass", freq: 3500 });
  },
  unsnap() {
    tone(1200, 0.06, "triangle", 0.07, 0, 700);
  },
  switchToggle(on: boolean) {
    burst({ dur: 0.03, vol: 0.12, type: "bandpass", freq: on ? 3200 : 2400, q: 4 });
    tone(on ? 900 : 650, 0.05, "square", 0.04, 0.01);
  },
  error() {
    tone(180, 0.18, "sawtooth", 0.07);
    tone(140, 0.22, "sawtooth", 0.06, 0.08);
  },
  glass() {
    // Glass clink: inharmonic partials with fast decay.
    for (const [f, v] of [[2730, 0.06], [4210, 0.035], [6120, 0.02]] as const) tone(f, 0.35, "sine", v);
  },
  reward(levelUp: boolean) {
    const notes = levelUp ? [523, 659, 784, 1047, 1319] : [659, 880, 1175];
    notes.forEach((n, i) => tone(n, 0.25, "triangle", 0.07, i * 0.075));
  },
  short() {
    burst({ dur: 0.25, vol: 0.25, type: "highpass", freq: 1500 });
    tone(90, 0.3, "sawtooth", 0.1);
  },
  /** Liquid pour: band-passed noise with a wobbling centre frequency ("glug"). */
  pour(seconds = 1.2) {
    const c = ac();
    if (!c || !master) return;
    const src = noise(c);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 3.5;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 7 + Math.random() * 4;
    lfoGain.gain.value = 260;
    f.frequency.value = 650;
    lfo.connect(lfoGain).connect(f.frequency);
    const g = c.createGain();
    src.connect(f).connect(g).connect(master);
    const end = env(c, g, 0.32, 0.08, seconds * 0.7, seconds * 0.3);
    // Pitch rises as the vessel fills.
    f.frequency.linearRampToValueAtTime(1100, c.currentTime + seconds);
    src.start();
    lfo.start();
    src.stop(end + 0.05);
    lfo.stop(end + 0.05);
    // Droplet plinks.
    for (let i = 0; i < 6; i++) tone(900 + Math.random() * 900, 0.06, "sine", 0.03, Math.random() * seconds, 400);
  },
  /** Effervescence: many tiny random pops. */
  fizz(seconds = 2.5, intensity = 1) {
    const c = ac();
    if (!c) return;
    const n = Math.round(60 * seconds * intensity);
    for (let i = 0; i < n; i++) {
      const when = Math.random() * seconds;
      burst({ dur: 0.012 + Math.random() * 0.02, vol: 0.03 + Math.random() * 0.05 * intensity, type: "bandpass", freq: 2000 + Math.random() * 5000, q: 6, when, attack: 0.002 });
    }
    burst({ dur: seconds, vol: 0.04 * intensity, type: "highpass", freq: 5000, attack: 0.2 });
  },
  precipitate() {
    burst({ dur: 1.2, vol: 0.05, type: "lowpass", freq: 900, freqTo: 300, attack: 0.3 });
  },
  ignite() {
    burst({ dur: 0.5, vol: 0.35, type: "lowpass", freq: 400, freqTo: 1800, attack: 0.02 });
    tone(80, 0.4, "sine", 0.15, 0, 50);
  },
  /** Sparks crackle (steel wool / magnesium). */
  sparks(seconds = 2.5) {
    const c = ac();
    if (!c) return;
    for (let i = 0; i < seconds * 70; i++) {
      burst({ dur: 0.006 + Math.random() * 0.012, vol: 0.05 + Math.random() * 0.12, type: "highpass", freq: 3000 + Math.random() * 4000, when: Math.random() * seconds, attack: 0.001 });
    }
    burst({ dur: seconds, vol: 0.08, type: "bandpass", freq: 800, q: 0.7, attack: 0.1 });
  },
  sizzle(seconds = 1.5) {
    burst({ dur: seconds, vol: 0.12, type: "highpass", freq: 4500, attack: 0.05 });
  },
  /** Continuous sounds keyed by id: burner roar, motor hum, buzzer. */
  loop(id: string, kind: "burner" | "motor" | "buzzer" | "boil", level = 1) {
    const c = ac();
    if (!c || !master) return;
    const existing = loops.get(id);
    if (existing) {
      existing.update?.(level);
      return;
    }
    const g = c.createGain();
    g.gain.value = 0.0001;
    g.connect(master);
    const nodes: AudioScheduledSourceNode[] = [];
    let update: ((v: number) => void) | undefined;
    if (kind === "burner" || kind === "boil") {
      const src = noise(c);
      const f = c.createBiquadFilter();
      f.type = kind === "burner" ? "lowpass" : "bandpass";
      f.frequency.value = kind === "burner" ? 520 : 1400;
      f.Q.value = kind === "burner" ? 0.8 : 2;
      src.connect(f).connect(g);
      nodes.push(src);
      update = (v) => g.gain.setTargetAtTime((kind === "burner" ? 0.22 : 0.08) * v, c.currentTime, 0.2);
    } else {
      const o = c.createOscillator();
      o.type = kind === "buzzer" ? "square" : "sawtooth";
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = kind === "buzzer" ? 3000 : 600;
      o.connect(f).connect(g);
      nodes.push(o);
      update = (v) => {
        o.frequency.setTargetAtTime(kind === "buzzer" ? 2300 : 60 + 140 * v, c.currentTime, 0.1);
        g.gain.setTargetAtTime((kind === "buzzer" ? 0.035 : 0.06) * Math.min(1, v + 0.15), c.currentTime, 0.15);
      };
    }
    nodes.forEach((n) => n.start());
    update(level);
    loops.set(id, {
      update,
      stop: () => {
        g.gain.setTargetAtTime(0.0001, c.currentTime, 0.12);
        nodes.forEach((n) => n.stop(c.currentTime + 0.6));
        loops.delete(id);
      },
    });
  },
  stopLoop(id: string) {
    loops.get(id)?.stop();
  },
  stopAll() {
    for (const l of [...loops.values()]) l.stop();
  },
};
