import Link from "next/link";
import { AuthCard, AuthField } from "@/components/site/AuthCard";

export default function LoginPage() {
  return (
    <AuthCard
      title="Entrar no POSTime"
      subtitle="Acesse sua conta para continuar gerando conteúdo."
      submitLabel="Entrar"
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
