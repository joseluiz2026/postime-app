import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) redirect("/login");

  return <AdminShell>{children}</AdminShell>;
}
