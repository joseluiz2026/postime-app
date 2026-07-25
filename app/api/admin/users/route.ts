import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { getUsersWithSubscriptions } from "@/lib/admin/users";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const subscribedOnly = new URL(request.url).searchParams.get("subscribed") === "true";
  const users = await getUsersWithSubscriptions();
  const result = subscribedOnly ? users.filter((u) => u.subscriptionStatus === "active") : users;

  return NextResponse.json({ users: result });
}
