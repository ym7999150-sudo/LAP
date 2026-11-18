"use client";
import { useEffect, useRef } from "react";
import { create } from "zustand";
import { findReactionById } from "@/lib/chem/reactions";
import { sfx } from "@/lib/client/sound";
import type { ChemFx } from "./models/chemistry";
import { useEditor } from "./store";
import { useSim } from "./useSimulation";

interface Timers {
  gas: [number, number]; // [start, end] ms
  precip: [number, number];
  flame: [number, number];
  sparks: [number, number];
  smoke: [number, number];
  flash: [number, number];
}

const ZERO: ChemFx = { gas: 0, precip: 0, flame: 0, sparks: 0, steam: 0, smoke: 0, flash: 0 };
export const useChemFx = create<{ levels: Record<string, ChemFx>; lastMessages: { id: number; containerId: string; text: { en: string; ar: string }; tone: "info" | "warn" | "ok" }[] }>(() => ({ levels: {}, lastMessages: [] }));

export function fxFor(id: string): ChemFx {
  return useChemFx.getState().levels[id] ?? ZERO;
}

function level([s, e]: [number, number], now: number, fadeIn = 300) {
  if (now < s || now > e) return 0;
  const inn = Math.min(1, (now - s) / fadeIn);
  const out = Math.min(1, (e - now) / Math.max(1, (e - s) * 0.5));
  return inn * out;
}

let msgId = 0;

/** Watches chemistry events, schedules visual effects and plays matching sounds. */
export function ChemFxTracker() {
  const events = useSim((s) => s.chem.events);
  const containers = useSim((s) => s.chem.containers);
  const prevLen = useRef<number | null>(null);
  const timers = useRef<Record<string, Timers>>({});

  useEffect(() => {
    if (prevLen.current === null || events.length < prevLen.current) {
      prevLen.current = events.length; // initial load or undo: no replays of old effects
      return;
    }
    const fresh = events.slice(prevLen.current);
    prevLen.current = events.length;
    const now = performance.now();
    const delay = 150;
    for (const ev of fresh) {
      const t = (timers.current[ev.containerId] ??= { gas: [0, 0], precip: [0, 0], flame: [0, 0], sparks: [0, 0], smoke: [0, 0], flash: [0, 0] });
      if (ev.kind === "reaction" && ev.reactionId) {
        const r = findReactionById(ev.reactionId);
        if (!r) continue;
        const strength = Math.min(1, 0.35 + (ev.extentMol ?? 0) * 40);
        const dur = 3000 + strength * 6000;
        if (r.observations.gas) {
          t.gas = [now + delay, now + delay + dur];
          setTimeout(() => sfx.fizz(dur / 1000, strength), delay);
        }
        if (r.observations.precipitate) {
          t.precip = [now + delay, now + delay + 4500];
          setTimeout(() => sfx.precipitate(), delay);
        }
        if (r.id === "combustion-steel-wool") {
          t.sparks = [now + 200, now + 5200];
          t.smoke = [now + 600, now + 6000];
          setTimeout(() => {
            sfx.ignite();
            sfx.sparks(4.5);
          }, 200);
        } else if (r.observations.flame) {
          t.flame = [now + 200, now + 4500];
          t.flash = [now + 200, now + 3800];
          t.smoke = [now + 800, now + 7000];
          setTimeout(() => {
            sfx.ignite();
            sfx.sizzle(3.5);
          }, 200);
        }
        if (r.id === "alkali-na-water") {
          t.sparks = [now + 300, now + 2500];
          setTimeout(() => sfx.sizzle(2.5), 300);
        }
        useChemFx.setState((s) => ({ lastMessages: [...s.lastMessages.slice(-4), { id: ++msgId, containerId: ev.containerId, text: r.observations.colorChange ?? r.explanation, tone: "ok" }] }));
      } else if (ev.message && (ev.kind === "unsupported" || ev.kind === "no-reaction" || ev.kind === "needs-condition")) {
        useChemFx.setState((s) => ({ lastMessages: [...s.lastMessages.slice(-4), { id: ++msgId, containerId: ev.containerId, text: ev.message!, tone: ev.kind === "unsupported" ? "warn" : "info" }] }));
      } else if (ev.kind === "overflow") {
        sfx.error();
      }
    }
  }, [events]);

  // Publish effect levels at ~12 Hz.
  useEffect(() => {
    const iv = setInterval(() => {
      const now = performance.now();
      const levels: Record<string, ChemFx> = {};
      const ids = new Set([...Object.keys(timers.current), ...Object.keys(containers)]);
      for (const id of ids) {
        const t = timers.current[id];
        const c = containers[id];
        levels[id] = {
          gas: t ? level(t.gas, now) : 0,
          precip: t ? level(t.precip, now) : 0,
          flame: t ? level(t.flame, now, 80) : 0,
          sparks: t ? level(t.sparks, now, 100) : 0,
          smoke: t ? level(t.smoke, now, 800) : 0,
          flash: t ? level(t.flash, now, 60) : 0,
          steam: c && c.volumeMl > 0 && c.tempC >= 70 ? Math.min(1, (c.tempC - 70) / 30) : 0,
        };
      }
      useChemFx.setState({ levels });
    }, 80);
    return () => clearInterval(iv);
  }, [containers]);

  // Burner roar while any lit burner is present.
  const objects = useEditor((s) => s.doc.objects);
  useEffect(() => {
    const lit = objects.some((o) => o.type === "bunsen-burner" && o.props.lit !== false);
    if (lit) sfx.loop("burner", "burner", 1);
    else sfx.stopLoop("burner");
    const boiling = Object.values(containers).some((c) => c.volumeMl > 0 && c.tempC >= 99);
    if (boiling) sfx.loop("boil", "boil", 1);
    else sfx.stopLoop("boil");
  }, [objects, containers]);
  useEffect(() => () => sfx.stopAll(), []);
  return null;
}
