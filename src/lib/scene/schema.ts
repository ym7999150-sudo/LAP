import { z } from "zod";

/**
 * Versioned, serialisable scene document. Pure data — never executable code.
 * Bump SCENE_SCHEMA_VERSION and add a migration in ./migrate.ts when the shape changes.
 */
export const SCENE_SCHEMA_VERSION = 1 as const;
export const MAX_OBJECTS = 300;
export const MAX_WIRES = 600;
export const MAX_CHEM_OPS = 500;

const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/);
const finite = z.number().finite();
const vec3 = z.tuple([finite, finite, finite]);
const coord = finite.min(-50).max(50);

export const propValue = z.union([finite, z.boolean(), z.string().max(120)]);

export const sceneObjectSchema = z.object({
  id,
  type: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  position: z.tuple([coord, coord, coord]),
  rotation: vec3,
  scale: z.tuple([finite.min(0.25).max(4), finite.min(0.25).max(4), finite.min(0.25).max(4)]),
  props: z.record(z.string().max(40), propValue).refine((r) => Object.keys(r).length <= 30, "too many props"),
  label: z.string().max(60).optional(),
});

export const endpointSchema = z.object({ objectId: id, terminalId: z.string().min(1).max(32) });

export const wireSchema = z.object({
  id,
  from: endpointSchema,
  to: endpointSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#e11d48"),
});

export const chemOpSchema = z.discriminatedUnion("kind", [
  // Add stock reagent from a reagent bottle (or the library) into a container.
  z.object({
    kind: z.literal("add"),
    containerId: id,
    substanceId: z.string().min(1).max(48),
    volumeMl: finite.min(0).max(1000).optional(),
    massG: finite.min(0).max(1000).optional(),
    concentration: finite.min(0).max(20).optional(),
  }),
  z.object({ kind: z.literal("pour"), fromId: id, toId: id, volumeMl: finite.positive().max(1000) }),
  z.object({ kind: z.literal("heat"), containerId: id, seconds: finite.positive().max(600) }),
  z.object({ kind: z.literal("empty"), containerId: id }),
]);

export const sceneDocumentSchema = z.object({
  schemaVersion: z.literal(SCENE_SCHEMA_VERSION),
  lab: z.enum(["physics", "chemistry"]),
  objects: z.array(sceneObjectSchema).max(MAX_OBJECTS),
  wires: z.array(wireSchema).max(MAX_WIRES),
  chemistry: z.object({ operations: z.array(chemOpSchema).max(MAX_CHEM_OPS) }).default({ operations: [] }),
  meta: z
    .object({
      title: z.string().max(120).optional(),
      experimentId: z.string().max(64).optional(),
      createdWith: z.string().max(40).optional(),
    })
    .default({}),
});

export type SceneObject = z.infer<typeof sceneObjectSchema>;
export type Wire = z.infer<typeof wireSchema>;
export type ChemOp = z.infer<typeof chemOpSchema>;
export type SceneDocument = z.infer<typeof sceneDocumentSchema>;
export type PropValue = z.infer<typeof propValue>;

export function emptyScene(lab: "physics" | "chemistry"): SceneDocument {
  return { schemaVersion: SCENE_SCHEMA_VERSION, lab, objects: [], wires: [], chemistry: { operations: [] }, meta: {} };
}
