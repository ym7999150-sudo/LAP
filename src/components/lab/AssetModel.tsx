"use client";
import { useGLTF } from "@react-three/drei";
import { Component, Suspense, useMemo, type ReactNode } from "react";
import { Box3, Vector3, type Object3D } from "three";
import manifest from "../../../public/models/manifest.json";

export interface AssetEntry {
  id: string;
  name: string;
  path: string; // served from /public, e.g. /models/beaker.glb
  source: string;
  license: string;
  attribution: string;
  intendedUse: string;
  fallback: string; // procedural geometry key used when the file is missing or fails
  targetSize: number; // longest dimension in scene units after normalisation
}

const ASSETS = (manifest as { assets: AssetEntry[] }).assets;
export const getAsset = (id?: string) => (id ? ASSETS.find((a) => a.id === id) : undefined);

class LoadBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.warn("GLB asset failed to load; using procedural fallback", e);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Loaded({ entry }: { entry: AssetEntry }) {
  const { scene } = useGLTF(entry.path); // cached by URL across instances
  const object = useMemo(() => {
    const clone: Object3D = scene.clone(true);
    // Normalise scale so the longest side matches targetSize, and sit the model on the table.
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const k = entry.targetSize / Math.max(size.x, size.y, size.z, 1e-6);
    clone.scale.setScalar(k);
    const b2 = new Box3().setFromObject(clone);
    const c = b2.getCenter(new Vector3());
    clone.position.set(-c.x, -b2.min.y, -c.z);
    clone.traverse((o) => {
      const m = o as Object3D & { castShadow?: boolean; receiveShadow?: boolean };
      m.castShadow = true;
      m.receiveShadow = true;
    });
    return clone;
  }, [scene, entry.targetSize]);
  return <primitive object={object} />;
}

/** Renders a locally hosted, licence-checked GLB/GLTF model with the procedural model as fallback. */
export function AssetModel({ assetId, fallback }: { assetId?: string; fallback: ReactNode }) {
  const entry = getAsset(assetId);
  if (!entry) return <>{fallback}</>;
  return (
    <LoadBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <Loaded entry={entry} />
      </Suspense>
    </LoadBoundary>
  );
}
