"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard, AuthField, type AuthResult } from "@/components/site/AuthCard";
import { createClient } from "@/lib/supabase/client";
import { translateAuthError } from "@/lib/supabase/errors";

export default function CadastroPage() {
  const router = useRouter();

  async function handleSubmit(formData: FormData): Promise<AuthResult> {
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) {
      return { error: translateAuthError(error.message) };
    }

    if (data.session) {
      router.push("/app/fonte");
      router.refresh();
      return;
    }

    return { info: "Quase lá! Confirme seu cadastro pelo link que enviamos para o seu e-mail." };
  }

  return (
    <AuthCard
      title="Crie sua conta grátis"
      subtitle="9 dias grátis, sem cartão de crédito. Nome, e-mail e senha — só isso."
      submitLabel="Criar minha conta"
      onSubmit={handleSubmit}
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="text-[var(--gold)] hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <AuthField label="Nome" name="name" type="text" placeholder="Seu nome" required />
      <AuthField label="E-mail" name="email" type="email" placeholder="voce@email.com" required />
      <AuthField label="Senha" name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} required />
    </AuthCard>
  );
}
