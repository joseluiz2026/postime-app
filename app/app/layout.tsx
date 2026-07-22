import { redirect } from "next/navigation";
import { AccountCard } from "@/components/app/AccountCard";
import { WizardModals } from "@/components/app/modals";
import { Stepper } from "@/components/app/Stepper";
import { ThemeSwitcher } from "@/components/app/ThemeSwitcher";
import { ThemeProvider } from "@/lib/theme-context";
import { createClient } from "@/lib/supabase/server";
import { WizardProvider } from "@/lib/wizard-context";
import { DistributionProvider } from "@/lib/distribution-context";
import { TRIAL_DAYS } from "@/lib/plan";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const initialName = (user.user_metadata?.full_name as string | undefined)?.trim() || user.email || "Você";
  const trialEndsAt = new Date(user.created_at);
  trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

  return (
    <ThemeProvider>
    <WizardProvider
      initialName={initialName}
      userEmail={user.email ?? ""}
      userId={user.id}
      trialEndsAt={trialEndsAt.toISOString()}
    >
    <DistributionProvider>
      <div className="max-w-[880px] mx-auto px-8 pt-10 pb-24">
        <div className="bg-[var(--bg-2)] border-[0.5px] border-[var(--line)] border-b-[2.5px] border-b-[var(--gold)] rounded-[18px] px-8 pt-9 pb-[30px] mb-8">
          <div className="flex justify-between items-start gap-8 flex-wrap max-[640px]:justify-center">
            <div className="flex-1 min-w-[230px]">
              <p className="font-mono text-[11px] tracking-[0.14em] text-[var(--gold)] uppercase mb-3">
                O seu motor de conteúdos virais para TikTok
              </p>
              <div className="flex items-center gap-3 mb-2">
                <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true" className="shrink-0">
                  <defs>
                    <linearGradient id="postoraGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="var(--gold)" />
                      <stop offset="1" stopColor="var(--teal)" />
                    </linearGradient>
                  </defs>
                  <rect width="40" height="40" rx="11" fill="url(#postoraGrad)" />
                  <path d="M15 11.5v17l14-8.5z" fill="#12141A" />
                </svg>
                <h1 className="font-[var(--font-display)] text-[36px] font-extrabold m-0 leading-[1.05] text-[var(--text-1)] tracking-[-0.02em]">
                  POST<span className="text-[var(--gold)]">i</span>
                  <span className="bg-gradient-to-br from-[var(--gold)] to-[var(--teal)] bg-clip-text text-transparent">
                    me
                  </span>
                </h1>
              </div>
              <p className="text-[15px] text-[var(--text-2)] m-0 max-w-[520px] leading-relaxed">
                Transforme qualquer material em roteiros diários, narrados com sua própria voz, prontos para
                publicar.
              </p>
              <ThemeSwitcher />
            </div>
            <AccountCard />
          </div>
        </div>

        <Stepper />

        {children}
      </div>
      <WizardModals />
    </DistributionProvider>
    </WizardProvider>
    </ThemeProvider>
  );
}
