import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// A draft this large already means something client-side is misbehaving —
// caps here are just a sanity backstop against an accidental infinite-growth bug,
// not a real product limit (qty is already capped at 20 per generation).
const MAX_TEMAS = 100;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("roteiro_drafts")
    .select("roteiros, used_temas, failed_temas, audio_paths, audio_durations")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "load_failed" }, { status: 500 });

  return NextResponse.json({
    draft: data
      ? {
          roteiros: data.roteiros ?? [],
          usedTemas: data.used_temas ?? [],
          failedTemas: data.failed_temas ?? [],
          audioPaths: data.audio_paths ?? [],
          audioDurations: data.audio_durations ?? [],
        }
      : null,
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const roteiros = Array.isArray(body?.roteiros) ? body.roteiros.slice(0, MAX_TEMAS) : [];
  const usedTemas = Array.isArray(body?.usedTemas) ? body.usedTemas.slice(0, MAX_TEMAS) : [];
  const failedTemas = Array.isArray(body?.failedTemas) ? body.failedTemas.slice(0, MAX_TEMAS) : [];
  const audioPaths = Array.isArray(body?.audioPaths) ? body.audioPaths.slice(0, MAX_TEMAS) : [];
  const audioDurations = Array.isArray(body?.audioDurations) ? body.audioDurations.slice(0, MAX_TEMAS) : [];

  // An empty roteiros array means "nothing to resume" — delete the row instead
  // of leaving a stale empty draft around indefinitely.
  if (roteiros.length === 0) {
    await supabase.from("roteiro_drafts").delete().eq("user_id", user.id);
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("roteiro_drafts").upsert({
    user_id: user.id,
    roteiros,
    used_temas: usedTemas,
    failed_temas: failedTemas,
    audio_paths: audioPaths,
    audio_durations: audioDurations,
  });

  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
