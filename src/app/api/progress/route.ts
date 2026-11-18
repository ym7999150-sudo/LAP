import { json, requireUser, route } from "@/lib/server/http";
import { completedExperiments, listRewardKeys } from "@/lib/server/services";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, { db }) => {
  const user = await requireUser(db);
  const [completed, reactions] = await Promise.all([completedExperiments(db, user.id), listRewardKeys(db, user.id, "reaction:")]);
  return json({ completed, reactions: reactions.map((k) => k.slice(9)) });
});
