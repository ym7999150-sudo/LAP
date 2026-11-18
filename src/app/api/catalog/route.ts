import { NextResponse } from "next/server";
import { z } from "zod";
import { searchCatalog } from "@/lib/catalog/search";

const q = z.object({
  kind: z.enum(["components", "substances", "reactions"]).default("components"),
  q: z.string().max(80).optional(),
  category: z.string().max(40).optional(),
  lab: z.enum(["physics", "chemistry"]).optional(),
  page: z.coerce.number().int().min(0).max(500).default(0),
  size: z.coerce.number().int().min(1).max(60).default(24),
});

export async function GET(req: Request) {
  const parsed = q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  return NextResponse.json(searchCatalog(parsed.data), { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
}
