"use client";
import { Copy, Flame, RotateCw, Trash2, Droplets, Eraser, Unplug } from "lucide-react";
import { useState } from "react";
import { isContainerType } from "@/lib/chem/engine";
import { reactionEquation } from "@/lib/chem/format";
import { prettyFormula } from "@/lib/chem/formula";
import { findReactionById } from "@/lib/chem/reactions";
import { getSubstance } from "@/lib/chem/substances";
import { getComponentDef, type PropDef } from "@/lib/registry";
import { useI18n } from "@/lib/i18n/client";
import { sfx } from "@/lib/client/sound";
import { fmt } from "../models/physics";
import { useEditor } from "../store";
import { useSim } from "../useSimulation";
import { SupportBadge } from "./SupportBadge";

const WIRE_COLORS = ["#e11d48", "#111827", "#2563eb", "#16a34a", "#f59e0b", "#e5e7eb"];

function PropField({ objId, def, value }: { objId: string; def: PropDef; value: unknown }) {
  const { L } = useI18n();
  const setProp = useEditor((s) => s.setProp);
  const readOnly = useEditor((s) => s.readOnly);
  if (def.kind === "boolean")
    return (
      <label className="flex min-h-10 items-center justify-between gap-3 text-sm">
        <span>{L(def.label)}</span>
        <input
          type="checkbox"
          className="size-5 accent-[var(--color-accent)]"
          checked={value === true}
          disabled={readOnly}
          onChange={(e) => {
            setProp(objId, def.key, e.target.checked);
            if (def.key === "closed") sfx.switchToggle(e.target.checked);
          }}
        />
      </label>
    );
  if (def.kind === "select")
    return (
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{L(def.label)}</span>
        <select className="input" value={String(value ?? def.default)} disabled={readOnly} onChange={(e) => setProp(objId, def.key, e.target.value)}>
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>
              {L(o.label)}
            </option>
          ))}
        </select>
      </label>
    );
  const v = typeof value === "number" ? value : def.default;
  if (def.min === def.max) return null;
  const logScale = def.max / Math.max(def.min, 1e-9) > 1000;
  const toSlider = (x: number) => (logScale ? Math.log10(x) : x);
  const fromSlider = (x: number) => (logScale ? Number(Math.pow(10, x).toPrecision(3)) : x);
  return (
    <label className="block text-sm">
      <span className="mb-1 flex justify-between text-muted">
        <span>{L(def.label)}</span>
        <span className="mono text-ink ltr-num">
          {v} {def.unit}
        </span>
      </span>
      <div className="flex items-center gap-2">
        <input
          type="range"
          className="w-full accent-[var(--color-accent)]"
          min={toSlider(def.min)}
          max={toSlider(def.max)}
          step={logScale ? 0.01 : def.step}
          value={toSlider(v)}
          disabled={readOnly}
          onChange={(e) => setProp(objId, def.key, fromSlider(Number(e.target.value)))}
        />
        <input
          type="number"
          className="input h-8 w-24 px-2 text-xs ltr-num"
          min={def.min}
          max={def.max}
          step={def.step}
          value={v}
          disabled={readOnly}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) setProp(objId, def.key, Math.min(def.max, Math.max(def.min, n)));
          }}
        />
      </div>
    </label>
  );
}

function ElectricalReadout({ id }: { id: string }) {
  const { t } = useI18n();
  const r = useSim((s) => s.circuit.components[id]);
  const running = useEditor((s) => s.running);
  if (!r || !running) return null;
  const rows: [string, string][] = [
    [t("voltage"), fmt(r.voltage, "V")],
    [t("current"), fmt(r.current, "A")],
    [t("power"), fmt(r.power, "W")],
  ];
  if (r.readingUnit) rows.unshift([t("reading"), fmt(r.reading ?? null, r.readingUnit)]);
  if (r.fieldT !== undefined) rows.push(["B", `${(r.fieldT * 1000).toFixed(2)} mT`]);
  return (
    <div className="grid grid-cols-2 gap-2">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-lg border border-line bg-bg/60 p-2">
          <div className="text-[11px] text-faint">{k}</div>
          <div className="mono text-sm text-accent ltr-num">{v}</div>
        </div>
      ))}
    </div>
  );
}

function ContainerPanel({ id }: { id: string }) {
  const { t, L } = useI18n();
  const view = useSim((s) => s.chem.containers[id]);
  const events = useSim((s) => s.chem.events);
  const objects = useEditor((s) => s.doc.objects);
  const chemOp = useEditor((s) => s.chemOp);
  const moveObject = useEditor((s) => s.moveObject);
  const checkpoint = useEditor((s) => s.checkpoint);
  const readOnly = useEditor((s) => s.readOnly);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState(10);
  const others = objects.filter((o) => o.id !== id && isContainerType(o.type));
  const burner = objects.find((o) => (o.type === "bunsen-burner" || o.type === "hot-plate") && o.props.lit !== false);
  const self = objects.find((o) => o.id === id)!;
  const mine = events.filter((e) => e.containerId === id).slice(-6).reverse();

  const heat = () => {
    if (!burner) {
      sfx.error();
      return;
    }
    // Place the vessel on the burner's gauze / plate first.
    const top = burner.type === "bunsen-burner" ? 0.45 : 0.165;
    if (Math.hypot(self.position[0] - burner.position[0], self.position[2] - burner.position[2]) > 0.05 || Math.abs(self.position[1] - top) > 0.01) {
      checkpoint();
      moveObject(id, [burner.position[0], top, burner.position[2]]);
    }
    chemOp({ kind: "heat", containerId: id, seconds: 30 });
  };
  const pour = () => {
    if (!target || !view || view.volumeMl <= 0) return;
    const color = view.liquidColor;
    chemOp({ kind: "pour", fromId: id, toId: target, volumeMl: Math.min(amount, view.volumeMl) }, { kind: "pour", fromId: id, toId: target, color });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          [t("volume"), `${(view?.volumeMl ?? 0).toFixed(1)} mL`],
          [t("temperature"), `${(view?.tempC ?? 22).toFixed(1)} °C`],
          ["pH", view?.pH == null ? "—" : `${view.pH.toFixed(1)}${view.pHMethod === "hint" ? "≈" : ""}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border border-line bg-bg/60 p-2">
            <div className="text-[11px] text-faint">{k}</div>
            <div className="mono text-sm text-accent ltr-num">{v}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold text-muted">{t("contents")}</div>
        {view && (view.dissolved.length || view.solids.length) ? (
          <ul className="space-y-1 text-xs">
            {[...view.dissolved, ...view.solids].map((c) => {
              const s = getSubstance(c.id);
              return (
                <li key={c.id} className="flex items-center gap-2">
                  <span className="size-3 rounded-full border border-line-strong" style={{ background: s?.color }} />
                  <span className="flex-1 truncate">{L(s?.name)}</span>
                  <span className="mono text-faint ltr-num">
                    {s?.formula ? prettyFormula(s.formula) : ""} {(c.mol * 1000).toFixed(2)} mmol
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-faint">{t("empty_list")}</p>
        )}
      </div>
      {!readOnly && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button className="btn" onClick={heat} title={burner ? "" : t("needs_heat_source")}>
              <Flame size={15} /> {t("heat")}
            </button>
            <button className="btn btn-danger" onClick={() => chemOp({ kind: "empty", containerId: id })}>
              <Eraser size={15} /> {t("empty")}
            </button>
          </div>
          {!burner && <p className="text-[11px] text-faint">{t("needs_heat_source")}</p>}
          {others.length > 0 && (
            <div className="rounded-lg border border-line p-2">
              <div className="mb-1.5 text-xs font-semibold text-muted">{t("pour_into")}</div>
              <div className="flex gap-2">
                <select className="input h-9 flex-1 text-xs" value={target} onChange={(e) => setTarget(e.target.value)}>
                  <option value="">—</option>
                  {others.map((o) => (
                    <option key={o.id} value={o.id}>
                      {L(getComponentDef(o.type)?.name)} · {o.id.slice(-4)}
                    </option>
                  ))}
                </select>
                <input type="number" className="input h-9 w-20 text-xs ltr-num" min={1} max={250} value={amount} onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))} aria-label={t("volume")} />
              </div>
              <button className="btn btn-primary mt-2 w-full" disabled={!target || !view?.volumeMl} onClick={pour}>
                <Droplets size={15} /> {t("pour")}
              </button>
            </div>
          )}
        </div>
      )}
      {mine.length > 0 && (
        <div>
          <div className="mb-1 text-xs font-semibold text-muted">{t("observations")}</div>
          <ul className="space-y-2">
            {mine.map((e, i) => {
              const r = e.reactionId ? findReactionById(e.reactionId) : undefined;
              if (e.kind === "reaction" && r)
                return (
                  <li key={i} className="rounded-lg border border-ok/30 bg-ok/5 p-2 text-xs">
                    <div className="mono mb-1 text-[11px] text-ok ltr-num" dir="ltr">
                      {reactionEquation(r)}
                    </div>
                    <div className="text-muted">{L(r.observations.colorChange ?? r.explanation)}</div>
                    {e.tempChange ? <div className="mono mt-1 text-warn ltr-num">ΔT ≈ +{e.tempChange.toFixed(1)} °C</div> : null}
                    {r.safety === "virtual-only" && <div className="mt-1 font-semibold text-danger">{t("virtual_only")}</div>}
                  </li>
                );
              if (e.message)
                return (
                  <li key={i} className={`rounded-lg border p-2 text-xs ${e.kind === "unsupported" ? "border-warn/30 bg-warn/5 text-warn" : "border-line text-muted"}`}>
                    {L(e.message)}
                  </li>
                );
              if (e.kind === "virtual-only") return <li key={i} className="rounded-lg border border-danger/40 p-2 text-xs text-danger">{t("virtual_only")}</li>;
              if (e.kind === "no-heat-source") return <li key={i} className="rounded-lg border border-line p-2 text-xs text-muted">{t("needs_heat_source")}</li>;
              return null;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Inspector() {
  const { t, L } = useI18n();
  const selection = useEditor((s) => s.selection);
  const selectedWire = useEditor((s) => s.selectedWire);
  const objects = useEditor((s) => s.doc.objects);
  const { rotateSelected, duplicateSelected, deleteSelected, setWireColor, setScale } = useEditor.getState();
  const wireColor = useEditor((s) => s.wireColor);
  const readOnly = useEditor((s) => s.readOnly);
  const obj = objects.find((o) => o.id === selection[0]);

  if (selectedWire)
    return (
      <div className="space-y-3 p-3">
        <div className="font-semibold">{t("tool_wire")}</div>
        <div className="flex flex-wrap gap-2">
          {WIRE_COLORS.map((c) => (
            <button key={c} onClick={() => setWireColor(c)} className={`size-8 rounded-full border-2 ${wireColor === c ? "border-accent" : "border-line-strong"}`} style={{ background: c }} aria-label={c} />
          ))}
        </div>
        {!readOnly && (
          <button className="btn btn-danger w-full" onClick={() => { deleteSelected(); sfx.unsnap(); }}>
            <Trash2 size={15} /> {t("delete")}
          </button>
        )}
      </div>
    );

  if (!obj) return <p className="p-4 text-sm text-faint">{t("nothing_selected")}</p>;
  const def = getComponentDef(obj.type)!;
  return (
    <div className="space-y-4 p-3">
      <div>
        <div className="font-semibold">{L(def.name)}</div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{L(def.description)}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <SupportBadge support={def.simulation.support} />
          {selection.length > 1 && <span className="chip ltr-num">×{selection.length}</span>}
        </div>
        {def.simulation.notes && <p className="mt-2 text-[11px] leading-relaxed text-faint">{L(def.simulation.notes)}</p>}
        {def.safety && <p className="mt-2 rounded-lg bg-warn/10 p-2 text-[11px] text-warn">{L(def.safety)}</p>}
      </div>
      {def.lab === "physics" && <ElectricalReadout id={obj.id} />}
      {isContainerType(obj.type) && <ContainerPanel id={obj.id} />}
      {def.props.length > 0 && (
        <div className="space-y-3">
          {def.props.map((p) => (
            <PropField key={p.key} objId={obj.id} def={p} value={obj.props[p.key]} />
          ))}
        </div>
      )}
      {!readOnly && (
        <>
          <label className="block text-sm">
            <span className="mb-1 flex justify-between text-muted">
              <span>Scale</span>
              <span className="mono ltr-num">{obj.scale[0].toFixed(2)}×</span>
            </span>
            <input type="range" className="w-full accent-[var(--color-accent)]" min={0.5} max={2} step={0.05} value={obj.scale[0]} onChange={(e) => setScale(obj.id, Number(e.target.value))} />
          </label>
          {def.terminals.length > 0 && (
            <div>
              <button className="btn w-full" onClick={() => { if (useEditor.getState().disconnectSelected()) sfx.unsnap(); }}>
                <Unplug size={15} /> {t("disconnect_all")}
              </button>
              <p className="mt-1.5 text-[11px] text-faint">{t("disconnect_hint")}</p>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <button className="btn" onClick={rotateSelected} title={t("rotate")}>
              <RotateCw size={15} />
            </button>
            <button className="btn" onClick={duplicateSelected} title={t("duplicate")}>
              <Copy size={15} />
            </button>
            <button className="btn btn-danger" onClick={deleteSelected} title={t("delete")}>
              <Trash2 size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
