import { NextResponse } from "next/server";
import { destroyAdminSession, logAdminAction } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST() {
  await logAdminAction("logout");
  await destroyAdminSession();
  return NextResponse.json({ ok: true });
}
