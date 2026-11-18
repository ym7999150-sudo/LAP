import { getComponentDef } from "@/lib/registry";
import { SCENE_SCHEMA_VERSION, sceneDocumentSchema, type SceneDocument } from "./schema";

export const MAX_IMPORT_BYTES = 512 * 1024;

export type ParseResult = { ok: true; doc: SceneDocument; warnings: string[] } | { ok: false; error: string };

/** Upgrade older documents to the current schema version. */
function migrate(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const doc = raw as Record<string, unknown>;
  // v0 (pre-release) had no schemaVersion and no chemistry block.
  if (doc.schemaVersion === undefined) {
    return { ...doc, schemaVersion: SCENE_SCHEMA_VERSION, chemistry: doc.chemistry ?? { operations: [] } };
  }
  return doc;
}

/**
 * Validate an untrusted scene document (import, API body, DB row).
 * Unknown component types and wires pointing at missing terminals are dropped with warnings.
 */
export function parseSceneDocument(input: unknown): ParseResult {
  const parsed = sceneDocumentSchema.safeParse(migrate(input));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first ? `${first.path.join(".") || "document"}: ${first.message}` : "invalid document" };
  }
  const doc = parsed.data;
  const warnings: string[] = [];
  const ids = new Set<string>();
  const objects = doc.objects.filter((o) => {
    if (ids.has(o.id)) {
      warnings.push(`duplicate object id ${o.id} removed`);
      return false;
    }
    if (!getComponentDef(o.type)) {
      warnings.push(`unknown component type ${o.type} removed`);
      return false;
    }
    ids.add(o.id);
    return true;
  });
  const byId = new Map(objects.map((o) => [o.id, o]));
  const hasTerminal = (objectId: string, terminalId: string) => {
    const o = byId.get(objectId);
    return !!o && !!getComponentDef(o.type)?.terminals.some((t) => t.id === terminalId);
  };
  const wireIds = new Set<string>();
  const wires = doc.wires.filter((w) => {
    if (wireIds.has(w.id)) return false;
    wireIds.add(w.id);
    const ok =
      hasTerminal(w.from.objectId, w.from.terminalId) &&
      hasTerminal(w.to.objectId, w.to.terminalId) &&
      !(w.from.objectId === w.to.objectId && w.from.terminalId === w.to.terminalId);
    if (!ok) warnings.push(`wire ${w.id} has an invalid endpoint and was removed`);
    return ok;
  });
  return { ok: true, doc: { ...doc, objects, wires }, warnings };
}

export function parseSceneJson(text: string): ParseResult {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: "file too large" };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "not valid JSON" };
  }
  // Accept both raw scene docs and exported project wrappers.
  if (data && typeof data === "object" && "scene" in data && "format" in data) {
    const wrapper = data as { format: unknown; scene: unknown };
    if (wrapper.format !== "labverse-project") return { ok: false, error: "unknown file format" };
    data = wrapper.scene;
  }
  return parseSceneDocument(data);
}
