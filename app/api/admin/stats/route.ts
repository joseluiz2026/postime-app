import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { getAdminStats } from "@/lib/admin/stats";

export const runtime = "nodejs";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stats = await getAdminStats();
  return NextResponse.json(stats);
}
