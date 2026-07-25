import { UsersTable } from "@/components/admin/UsersTable";

export default function AdminBuyersPage() {
  return (
    <div>
      <h1 className="font-[var(--font-display)] font-extrabold text-2xl mb-6">Compradores</h1>
      <p className="text-sm text-[var(--text-3)] mb-6">Assinantes com o plano Pro ativo, via Kiwify.</p>
      <UsersTable subscribedOnly />
    </div>
  );
}
