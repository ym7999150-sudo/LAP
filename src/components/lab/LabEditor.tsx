"use client";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Cable,
  Camera,
  Download,
  Grid3x3,
  Library as LibraryIcon,
  MousePointer2,
  Redo2,
  Save,
  Share2,
  SlidersHorizontal,
  Undo2,
  Upload,
  X,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { useSession } from "@/lib/client/session";

import { getExperiment } from "@/lib/curriculum/experiments";
import { useI18n } from "@/lib/i18n/client";
import { defaultProps, getComponentDef } from "@/lib/registry";
import { parseSceneDocument, parseSceneJson } from "@/lib/scene/migrate";
import { emptyScene, type SceneDocument } from "@/lib/scene/schema";
import { simulateCircuit } from "@/lib/sim/circuit/solver";
import { replayChemistry } from "@/lib/chem/engine";
import { ChemFxTracker } from "./chemFx";
import { GuidedPanel } from "./panels/GuidedPanel";
import { Inspector } from "./panels/Inspector";
import { Library } from "./panels/Library";
import { SimBar } from "./panels/SimBar";
import { LabScene } from "./Scene";
import { useEditor } from "./store";
import { SimRunner, useSim } from "./useSimulation";
import { ViewportGuard } from "./ViewportGuard";

interface Props {
  lab: "physics" | "chemistry";
  projectId?: string | null;
  experimentId?: string | null;
  shared?: { title: string; scene: unknown; owner: string } | null;
}

function templateScene(lab: "physics" | "chemistry", experimentId?: string | null): SceneDocument {
  const doc = emptyScene(lab);
  const exp = experimentId ? getExperiment(experimentId) : undefined;
  if (exp) {
    doc.meta.experimentId = exp.id;
    exp.template.forEach((tpl, i) => {
      const def = getComponentDef(tpl.type);
      if (!def) return;
      doc.objects.push({ id: `t${i}${tpl.type.slice(0, 3)}`, type: tpl.type, position: tpl.position, rotation: [0, 0, 0], scale: [1, 1, 1], props: { ...defaultProps(def), ...(tpl.props ?? {}) } });
    });
  } else if (lab === "physics") {
    // Starter bench: battery, switch and bulb ready to be wired.
    for (const [i, [type, x, z]] of ([["battery", -1.4, 0.2], ["switch", 0, -0.9], ["bulb", 1.4, 0.2]] as const).entries()) {
      const def = getComponentDef(type)!;
      doc.objects.push({ id: `s${i}${type.slice(0, 3)}`, type, position: [x, 0, z], rotation: [0, 0, 0], scale: [1, 1, 1], props: defaultProps(def) });
    }
  } else {
    for (const [i, [type, x, z]] of ([["beaker-250", -0.6, 0], ["test-tube", 0.5, 0.2], ["bunsen-burner", 1.6, -0.6], ["steel-wool-pad", -1.8, 0.8], ["crucible", -1.6, -0.5]] as const).entries()) {
      const def = getComponentDef(type)!;
      doc.objects.push({ id: `s${i}${type.slice(0, 3)}`, type, position: [x, 0, z], rotation: [0, 0, 0], scale: [1, 1, 1], props: { ...defaultProps(def), ...(type === "bunsen-burner" ? { lit: false } : {}) } });
    }
  }
  return doc;
}

export function LabEditor({ lab, projectId: initialProjectId, experimentId, shared }: Props) {
  const { t, L, dir } = useI18n();
  const { user, pushReward } = useSession();
  const router = useRouter();
  const doc = useEditor((s) => s.doc);
  const dirty = useEditor((s) => s.dirty);
  const tool = useEditor((s) => s.tool);
  const snap = useEditor((s) => s.snap);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const readOnly = useEditor((s) => s.readOnly);
  const { undo, redo, setTool, toggleSnap, load, markSaved } = useEditor.getState();

  const [projectId, setProjectId] = useState<string | null>(initialProjectId ?? null);
  const [title, setTitle] = useState<string>(shared?.title ?? (experimentId ? L(getExperiment(experimentId)?.title) : lab === "physics" ? t("nav_physics") : t("nav_chemistry")));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(!!experimentId);
  const [notice, setNotice] = useState<string | null>(null);
  const resetCamera = useRef<(() => void) | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Load project / shared scene / template.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (shared) {
        const p = parseSceneDocument(shared.scene);
        load(p.ok ? p.doc : emptyScene(lab), { readOnly: true });
      } else if (initialProjectId) {
        try {
          const r = await api<{ project: { title: string; scene: unknown; shareToken: string | null } }>(`/api/projects/${initialProjectId}`);
          const p = parseSceneDocument(r.project.scene);
          if (!cancelled && p.ok) {
            load(p.doc);
            setTitle(r.project.title);
            setShareToken(r.project.shareToken);
          }
        } catch {
          if (!cancelled) {
            setNotice(t("error_generic"));
            load(templateScene(lab));
          }
        }
      } else {
        load(templateScene(lab, experimentId));
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialProjectId, experimentId, lab, shared]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!user || readOnly) {
        if (!opts?.silent) setNotice(t("sign_in_to_save"));
        return;
      }
      setSaveState("saving");
      try {
        const scene = { ...useEditor.getState().doc, meta: { ...useEditor.getState().doc.meta, title } };
        if (projectId) {
          await api(`/api/projects/${projectId}`, { method: "PATCH", body: { title, scene } });
        } else {
          const r = await api<{ id: string; unlocked: never[] }>("/api/projects", { body: { title, scene } });
          setProjectId(r.id);
          router.replace(`/lab/${lab}?project=${r.id}`, { scroll: false });
          if (r.unlocked?.length) pushReward({ xpGained: 0, unlocked: r.unlocked, levelBefore: 0, levelAfter: 0 });
        }
        markSaved();
        setSaveState("saved");
      } catch (e) {
        setSaveState("error");
        if (!opts?.silent) setNotice(e instanceof ApiError ? e.code : t("error_generic"));
      }
    },
    [user, readOnly, projectId, title, lab, router, markSaved, pushReward, t],
  );

  // Debounced autosave for existing projects.
  useEffect(() => {
    if (!projectId || !dirty || !user || readOnly) return;
    const h = setTimeout(() => void save({ silent: true }), 2500);
    return () => clearTimeout(h);
  }, [doc, dirty, projectId, user, readOnly, save]);

  // Server-validated rewards: when the scene reaches a new milestone, ask the server to verify it.
  const claimed = useRef(new Set<string>());
  useEffect(() => {
    if (!user || readOnly || !loaded) return;
    const h = setTimeout(async () => {
      const d = useEditor.getState().doc;
      let key = "";
      if (lab === "physics") {
        const r = simulateCircuit(d);
        if (!r.closedCircuit) return;
        const lit = d.objects.filter((o) => (r.components[o.id]?.activity ?? 0) > 0.15).map((o) => o.type).sort();
        const em = d.objects.some((o) => (r.components[o.id]?.fieldT ?? 0) > 0.005);
        key = `p:${lit.join(",")}:${em}`;
        if (!lit.length && !em) return;
      } else {
        const r = replayChemistry(d);
        if (!r.reactionsObserved.length) return;
        key = `c:${[...r.reactionsObserved].sort().join(",")}`;
      }
      if (claimed.current.has(key)) return;
      claimed.current.add(key);
      try {
        const out = await api<{ xpGained: number; unlocked: never[]; levelBefore: number; levelAfter: number }>("/api/rewards/scene", { body: { scene: d } });
        pushReward(out);
      } catch {
        claimed.current.delete(key);
      }
    }, 1500);
    return () => clearTimeout(h);
  }, [doc, user, readOnly, loaded, lab, pushReward]);

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const s = useEditor.getState();
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        s.redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        s.duplicateSelected();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        s.deleteSelected();
      } else if (e.key.toLowerCase() === "r" && !mod) {
        s.rotateSelected();
      } else if (e.key.toLowerCase() === "w" && !mod && lab === "physics") {
        s.setTool("wire");
      } else if (e.key.toLowerCase() === "v" && !mod) {
        s.setTool("select");
      } else if (e.key === "Escape") {
        s.select(null);
        s.setTool("select");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, lab]);

  // Warn about leaving with unsaved work.
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (useEditor.getState().dirty && projectId) e.preventDefault();
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [projectId]);

  // Persist blown fuses into the document so they stay blown until reset.
  const blown = useSim((s) => s.circuit.blownFuses);
  useEffect(() => {
    for (const id of blown) {
      const o = useEditor.getState().doc.objects.find((x) => x.id === id);
      if (o && o.props.blown !== true) useEditor.getState().setProp(id, "blown", true);
    }
  }, [blown]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ format: "labverse-project", version: 1, title, scene: useEditor.getState().doc }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title.replace(/[^\p{L}\p{N}_-]+/gu, "_") || "labverse"}.labverse.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importJson = async (file: File) => {
    if (file.size > 512 * 1024) return setNotice("file too large");
    const r = parseSceneJson(await file.text());
    if (!r.ok) return setNotice(`${t("error_generic")} (${r.error})`);
    if (r.doc.lab !== lab) {
      router.push(`/lab/${r.doc.lab}`);
      return;
    }
    useEditor.getState().checkpoint();
    useEditor.setState({ doc: r.doc, dirty: true });
    if (r.warnings.length) setNotice(r.warnings.slice(0, 3).join(" · "));
  };
  const share = async () => {
    if (!projectId) {
      await save();
      return;
    }
    try {
      const r = await api<{ token: string }>(`/api/projects/${projectId}/share`, { method: "POST" });
      setShareToken(r.token);
      const url = `${location.origin}/shared/${r.token}`;
      await navigator.clipboard?.writeText(url).catch(() => {});
      setNotice(`${t("copied")}: ${url}`);
    } catch {
      setNotice(t("error_generic"));
    }
  };

  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;
  const saveLabel = saveState === "saving" ? t("saving") : dirty ? t("unsaved") : saveState === "saved" ? t("saved") : "";

  return (
    <div className="fixed inset-0 flex flex-col bg-bg">
      <SimRunner />
      {lab === "chemistry" && <ChemFxTracker />}
      {/* Top bar */}
      <header className="z-20 flex h-14 items-center gap-1.5 border-b border-line bg-surface/90 px-2 backdrop-blur sm:gap-2 sm:px-3">
        <Link href="/dashboard" className="btn btn-ghost btn-icon" aria-label="Back">
          <Back size={18} />
        </Link>
        <input
          className="min-w-0 max-w-[40vw] flex-shrink rounded-md bg-transparent px-2 py-1 text-sm font-semibold hover:bg-surface-2 focus:bg-surface-2 sm:max-w-xs"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value.slice(0, 120));
            useEditor.setState({ dirty: true });
          }}
          aria-label={t("rename")}
          readOnly={readOnly}
        />
        <span className="hidden text-xs text-faint md:inline">{saveLabel}</span>
        <div className="flex-1" />
        {!readOnly && (
          <div className="flex items-center gap-1">
            <button className={`btn btn-icon ${tool === "select" ? "border-accent text-accent" : "btn-ghost"}`} onClick={() => setTool("select")} title={`${t("tool_select")} (V)`} aria-pressed={tool === "select"}>
              <MousePointer2 size={17} />
            </button>
            {lab === "physics" && (
              <button className={`btn btn-icon ${tool === "wire" ? "border-accent text-accent" : "btn-ghost"}`} onClick={() => setTool("wire")} title={`${t("tool_wire")} (W)`} aria-pressed={tool === "wire"}>
                <Cable size={17} />
              </button>
            )}
            <button className="btn btn-ghost btn-icon" onClick={undo} disabled={!canUndo} title={`${t("undo")} (Ctrl+Z)`}>
              <Undo2 size={17} />
            </button>
            <button className="btn btn-ghost btn-icon" onClick={redo} disabled={!canRedo} title={`${t("redo")} (Ctrl+Y)`}>
              <Redo2 size={17} />
            </button>
            <button className={`btn btn-ghost btn-icon hidden sm:inline-flex ${snap ? "text-accent" : ""}`} onClick={toggleSnap} title={t("grid_snap")} aria-pressed={snap}>
              <Grid3x3 size={17} />
            </button>
          </div>
        )}
        <button className="btn btn-ghost btn-icon hidden sm:inline-flex" onClick={() => resetCamera.current?.()} title={t("reset_camera")}>
          <Camera size={17} />
        </button>
        <button className="btn btn-ghost btn-icon hidden md:inline-flex" onClick={exportJson} title={t("export")}>
          <Download size={17} />
        </button>
        {!readOnly && (
          <>
            <button className="btn btn-ghost btn-icon hidden md:inline-flex" onClick={() => fileInput.current?.click()} title={t("import")}>
              <Upload size={17} />
            </button>
            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && void importJson(e.target.files[0])} />
            <button className="btn btn-ghost btn-icon" onClick={share} title={t("share")} aria-label={t("share")}>
              <Share2 size={17} className={shareToken ? "text-accent" : ""} />
            </button>
            <button className="btn btn-primary h-9" onClick={() => void save()}>
              <Save size={16} /> <span className="hidden sm:inline">{t("save")}</span>
            </button>
          </>
        )}
        {experimentId && (
          <button className={`btn btn-icon ${guideOpen ? "text-accent" : "btn-ghost"}`} onClick={() => setGuideOpen((o) => !o)} aria-label={t("nav_experiments")}>
            <GraduationCap size={18} />
          </button>
        )}
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Library (desktop) */}
        {!readOnly && (
          <aside className="hidden w-64 shrink-0 border-e border-line bg-surface/70 lg:block">
            <div className="flex h-10 items-center px-3 text-xs font-semibold uppercase tracking-wide text-muted">{t("library")}</div>
            <div className="h-[calc(100%-2.5rem)]">
              <Library lab={lab} />
            </div>
          </aside>
        )}

        {/* Viewport */}
        <div className="relative min-w-0 flex-1">
          <ViewportGuard>{loaded && <LabScene lab={lab} cameraRef={resetCamera} />}</ViewportGuard>
          {!loaded && <div className="absolute inset-0 grid place-items-center text-muted">{t("loading")}</div>}
          <div className="pointer-events-none absolute inset-x-0 top-2 flex justify-center px-3">
            <div className="glass rounded-full px-3 py-1 text-[11px] text-muted">{readOnly ? `${t("open_read_only")}${shared ? ` · ${t("by")} ${shared.owner}` : ""}` : tool === "wire" ? t("wire_hint") : t("drag_hint")}</div>
          </div>
          {/* Mobile drawers toggles */}
          <div className="absolute bottom-3 start-3 flex gap-2 lg:hidden">
            {!readOnly && (
              <button className="btn glass h-11" onClick={() => setLeftOpen(true)}>
                <LibraryIcon size={17} /> {t("library")}
              </button>
            )}
          </div>
          <div className="absolute bottom-3 end-3 xl:hidden">
            <button className="btn glass h-11" onClick={() => setRightOpen(true)}>
              <SlidersHorizontal size={17} /> {t("inspector")}
            </button>
          </div>
          <AnimatePresence>
            {notice && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass absolute inset-x-3 top-12 mx-auto flex max-w-lg items-start gap-2 rounded-xl p-3 text-sm" role="status">
                <span className="flex-1 break-all">{notice}</span>
                <button onClick={() => setNotice(null)} aria-label="close">
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {guideOpen && experimentId && (
            <div className="absolute inset-y-2 end-2 z-10 w-[min(380px,calc(100%-1rem))]">
              <GuidedPanel experimentId={experimentId} onClose={() => setGuideOpen(false)} />
            </div>
          )}
        </div>

        {/* Inspector (desktop) */}
        <aside className="hidden w-80 shrink-0 border-s border-line bg-surface/70 xl:block">
          <div className="flex h-10 items-center px-3 text-xs font-semibold uppercase tracking-wide text-muted">{t("inspector")}</div>
          <div className="scroll-thin h-[calc(100%-2.5rem)] overflow-y-auto">
            <Inspector />
          </div>
        </aside>

        {/* Mobile bottom sheets */}
        <AnimatePresence>
          {(leftOpen || rightOpen) && (
            <motion.div className="absolute inset-0 z-30 bg-black/50 xl:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setLeftOpen(false); setRightOpen(false); }}>
              <motion.div
                className="absolute inset-x-0 bottom-0 flex max-h-[70%] flex-col rounded-t-2xl border-t border-line bg-surface"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 32, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm font-semibold">{leftOpen ? t("library") : t("inspector")}</span>
                  <button className="btn btn-ghost btn-icon" onClick={() => { setLeftOpen(false); setRightOpen(false); }} aria-label="close">
                    <X size={18} />
                  </button>
                </div>
                <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{leftOpen ? <Library lab={lab} onAdded={() => setLeftOpen(false)} /> : <Inspector />}</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom simulation bar */}
      <footer className="z-10 border-t border-line bg-surface/90 backdrop-blur">
        <SimBar lab={lab} />
      </footer>
    </div>
  );
}

