import { defaultProps, getComponentDef } from "@/lib/registry";
import { emptyScene, type SceneDocument } from "@/lib/scene/schema";

/** Small builder used by tests, curriculum templates and validators. */
export class CircuitBuilder {
  doc: SceneDocument = emptyScene("physics");
  private n = 0;
  add(type: string, props: Record<string, number | boolean | string> = {}, id?: string): string {
    const def = getComponentDef(type);
    if (!def) throw new Error(`unknown type ${type}`);
    const oid = id ?? `${type}-${++this.n}`;
    this.doc.objects.push({
      id: oid,
      type,
      position: [this.n * 0.8 - 3, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      props: { ...defaultProps(def), ...props },
    });
    return oid;
  }
  wire(a: string, b: string, id?: string): string {
    const [ao, at] = a.split(".") as [string, string];
    const [bo, bt] = b.split(".") as [string, string];
    const wid = id ?? `w${this.doc.wires.length + 1}`;
    this.doc.wires.push({ id: wid, from: { objectId: ao, terminalId: at }, to: { objectId: bo, terminalId: bt }, color: "#e11d48" });
    return wid;
  }
  set(id: string, key: string, value: number | boolean | string) {
    const o = this.doc.objects.find((x) => x.id === id);
    if (o) o.props[key] = value;
    return this;
  }
}
