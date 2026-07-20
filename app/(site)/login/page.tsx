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

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    router.push("/app/fonte");
    router.refresh();
  }

  return (
    <AuthCard
      title="Entrar no POSTime"
      subtitle="Acesse sua conta para continuar gerando conteúdo."
      submitLabel="Entrar"
      onSubmit={handleSubmit}
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link href="/cadastro" className="text-[var(--gold)] hover:underline">
            Criar conta grátis
          </Link>
        </>
      }
    >
      <AuthField label="E-mail" name="email" type="email" placeholder="voce@email.com" required />
      <AuthField label="Senha" name="password" type="password" placeholder="Sua senha" required />
    </AuthCard>
  );
}
