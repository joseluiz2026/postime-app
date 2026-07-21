import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchPexelsImage } from "@/lib/images/pexels";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const queries = Array.isArray(body?.queries) ? body.queries.map((q: unknown) => String(q ?? "")) : null;
  if (!queries || queries.length === 0 || queries.length > 20) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  try {
    const images = await Promise.all(queries.map((q: string) => searchPexelsImage(q)));
    return NextResponse.json({ images });
  } catch (err) {
    console.error("[/api/scenes/images]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "image_search_failed" }, { status: 502 });
  }
}
