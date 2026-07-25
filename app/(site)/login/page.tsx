"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard, AuthField, type AuthResult } from "@/components/site/AuthCard";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/errors";

export default function LoginPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData): Promise<AuthResult> {
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    // Checked first (server-side only) so the super-admin account can log in through
    // this same form — see app/api/admin/login. Any non-admin credential falls
    // through unchanged to the normal Supabase sign-in below.
    const adminRes = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });
    if (adminRes.status === 429) {
      return { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
    }
    if (adminRes.ok) {
      const { admin } = await adminRes.json();
      if (admin) {
        router.push("/admin");
        router.refresh();
        return;
      }
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    router.push("/app/fonte");
    router.refresh();
  }

  async function handleGoogle(): Promise<AuthResult> {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      return { error: translateAuthError(error.message) };
    }
  }

  return (
    <AuthCard
      title="Entrar no POSTime"
      subtitle="Acesse sua conta para continuar gerando conteúdo."
      submitLabel="Entrar"
      onSubmit={handleSubmit}
      onGoogle={handleGoogle}
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-[var(--gold)] hover:underline">
            Criar conta grátis
          </Link>
        </>
      }
    >
      <AuthField label="E-mail" name="email" type="text" placeholder="voce@email.com" required />
      <AuthField label="Senha" name="password" type="password" placeholder="Sua senha" required />
    </AuthCard>
  );
}
