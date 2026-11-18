"use client";
import { Component, useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch(err: unknown) {
    console.error("3D viewport error", err);
  }
  render() {
    return this.state.error ? this.props.fallback : this.props.children;
  }
}

/** Checks WebGL support and contains rendering errors so the rest of the editor stays usable. */
export function ViewportGuard({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => setOk(webglAvailable()), []);
  const fallback = (
    <div className="absolute inset-0 grid place-items-center p-6 text-center">
      <div className="panel max-w-md p-6">
        <p className="font-semibold">{t("webgl_error")}</p>
        <button className="btn mt-4" onClick={() => location.reload()}>
          {t("reset")}
        </button>
      </div>
    </div>
  );
  if (ok === null) return <div className="skeleton absolute inset-4" />;
  if (!ok) return fallback;
  return (
    <div className="absolute inset-0">
      <Boundary fallback={fallback}>{children}</Boundary>
    </div>
  );
}
