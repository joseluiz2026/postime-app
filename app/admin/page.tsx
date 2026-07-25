import { getAdminStats } from "@/lib/admin/stats";
import { MiniLineChart } from "@/components/admin/MiniLineChart";
import { Icon, type IconName } from "@/lib/icons";

const ACTION_LABELS: Record<string, string> = {
  login: "Login no admin",
  logout: "Logout do admin",
  suspend_user: "Usuário suspenso",
  unsuspend_user: "Usuário reativado",
  delete_user: "Usuário excluído",
  reset_password: "Senha redefinida",
  send_message: "Mensagem enviada",
  update_message_template: "Template de mensagem editado",
  update_ai_config: "Config de IA alterada",
  hero_video_add: "Vídeo do Hero adicionado",
  hero_video_update: "Vídeo do Hero editado",
  hero_video_delete: "Vídeo do Hero removido",
};

function KpiTile({ icon, label, value }: { icon: IconName; label: string; value: number }) {
  return (
    <div className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-[var(--bg-2)] flex items-center justify-center text-[var(--gold)] text-xl shrink-0">
        <Icon name={icon} />
      </div>
      <div>
        <p className="text-2xl font-[var(--font-display)] font-extrabold m-0 leading-none">{value}</p>
        <p className="text-xs text-[var(--text-3)] mt-1 m-0">{label}</p>
      </div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getAdminStats();

  return (
    <div>
      <h1 className="font-[var(--font-display)] font-extrabold text-2xl mb-6">Dashboard</h1>

      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiTile icon="users" label="Cadastrados" value={stats.kpis.totalCadastrados} />
        <KpiTile icon="crown" label="Assinantes ativos" value={stats.kpis.assinantesAtivos} />
        <KpiTile icon="movie" label="Vídeos hoje" value={stats.kpis.videosGeradosHoje} />
        <KpiTile icon="chart-bar" label="Vídeos gerados (total)" value={stats.kpis.videosGeradosTotal} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 max-[900px]:grid-cols-1">
        <MiniLineChart title="Cadastros por dia (30d)" days={stats.series.days} values={stats.series.signups} color="var(--gold)" />
        <MiniLineChart title="Vídeos gerados por dia (30d)" days={stats.series.days} values={stats.series.videos} color="var(--teal)" />
      </div>

      <div className="bg-[var(--bg-1)] border-[0.5px] border-[var(--line)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-3">Atividade recente</h3>
        {stats.auditLog.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">Nenhuma ação registrada ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {stats.auditLog.map((entry, i) => (
              <li key={i} className="flex items-center justify-between text-sm border-b border-[var(--line)] pb-2 last:border-0 last:pb-0">
                <span className="text-[var(--text-1)]">{ACTION_LABELS[entry.action] ?? entry.action}</span>
                <span className="text-xs text-[var(--text-3)] font-mono">
                  {new Date(entry.created_at).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
