"use client";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, Suspense, useMemo, type ReactNode } from "react";
import { Box3, DoubleSide, Euler, Group, MathUtils, MeshPhysicalMaterial, Vector3, type Mesh, type Object3D } from "three";
import manifest from "../../../public/models/manifest.json";

export interface AssetEntry {
  id: string;
  name: string;
  path: string;
  nodes?: string[];
  rotation?: [number, number, number]; // degrees
  fit?: [number | null, number | null, number | null];
  offsetY?: number;
  source: string;
  author: string;
  license: string;
  intendedUse: string;
}

const GLASS = new MeshPhysicalMaterial({
  color: "#e6f4ff",
  roughness: 0.04,
  metalness: 0,
  transparent: true,
  opacity: 0.22,
  side: DoubleSide,
  depthWrite: false,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
});

export const ASSETS =(manifest as unknown as { assets: AssetEntry[] }).assets;
export const getAsset = (id?: string) => (id ? ASSETS.find((a) => a.id === id) : undefined);

class LoadBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("3D asset failed to load; using procedural fallback", e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Called every frame with the model root so callers can animate named parts (needles, levers). */
export type Drive = (root: Object3D, dt: number) => void;

function Loaded({ entry, drive }: { entry: AssetEntry; drive?: Drive }) {
  const { scene } = useGLTF(entry.path); // cached per URL, shared across instances
  const root = useMemo(() => {
    const src = scene.clone(true);
    // Keep only requested nodes, each re-centred in the collection's space.
    const holder = new Group();
    if (entry.nodes?.length) {
      for (const name of entry.nodes) {
        const n = src.getObjectByName(name);
        if (n) holder.add(n);
      }
    } else holder.add(src);
    const rotated = new Group();
    rotated.add(holder);
    if (entry.rotation) rotated.rotation.copy(new Euler(...entry.rotation.map((d) => MathUtils.degToRad(d)) as [number, number, number]));
    rotated.updateMatrixWorld(true);
    const box = new Box3().setFromObject(rotated);
    const size = box.getSize(new Vector3());
    const fit = entry.fit ?? [null, 0.3, null];
    const ratios = fit.map((f, i) => (f == null ? null : f / Math.max(1e-6, size.getComponent(i))));
    const uniform = Math.min(...(ratios.filter((r) => r != null) as number[]));
    const s = new Vector3(...ratios.map((r) => (r == null || ratios.some((x) => x == null) ? uniform : r)) as [number, number, number]);
    const scaled = new Group();
    scaled.add(rotated);
    scaled.scale.copy(s);
    scaled.updateMatrixWorld(true);
    const b2 = new Box3().setFromObject(scaled);
    const c = b2.getCenter(new Vector3());
    scaled.position.set(-c.x, -b2.min.y + (entry.offsetY ?? 0), -c.z);
    const out = new Group();
    out.add(scaled);
    out.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      // Blended glass textures render dark in a dark scene; use a clear physical glass instead
      // so simulated liquids inside stay visible.
      const mat = m.material as { name?: string };
      if (mat?.name && /glass/i.test(mat.name)) {
        m.material = GLASS;
        m.castShadow = false;
        m.renderOrder = 2;
      }
    });
    return out;
  }, [scene, entry]);
  useFrame((_, dt) => drive?.(root, dt));
  return <primitive object={root} />;
}

/** Renders a locally hosted, licence-checked model; falls back to the procedural model on error. */
export function AssetModel({ assetId, fallback, drive }: { assetId?: string; fallback: ReactNode; drive?: Drive }) {
  const entry = getAsset(assetId);
  if (!entry) return <>{fallback}</>;
  return (
    <LoadBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Loaded entry={entry} drive={drive} />
      </Suspense>
    </LoadBoundary>
  );
}
