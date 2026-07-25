import { UsersTable } from "@/components/admin/UsersTable";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="font-[var(--font-display)] font-extrabold text-2xl mb-6">Usuários</h1>
      <UsersTable />
    </div>
  );
}
