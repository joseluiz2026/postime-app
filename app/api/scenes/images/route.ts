import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchStockImage } from "@/lib/images/stock";

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
  const themes: (string | null)[] = Array.isArray(body?.themes)
    ? body.themes.map((t: unknown) => (typeof t === "string" ? t : null))
    : queries.map(() => null);

  try {
    const images = await Promise.all(
      queries.map((q: string, i: number) => searchStockImage(q, { themeQuery: themes[i] })),
    );
    return NextResponse.json({ images });
  } catch (err) {
    console.error("[/api/scenes/images]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "image_search_failed" }, { status: 502 });
  }
}
