import { json, route } from "@/lib/server/http";
import { getShared } from "@/lib/server/services";

type Ctx = { params: Promise<{ token: string }> };

export const GET = route<Ctx>(async (_req, { db, params }) => {
  const { token } = await params;
  const p = await getShared(db, token);
  return p ? json({ project: p }) : json({ error: "not_found" }, 404);
});
