import Link from "next/link";
import { AuthCard, AuthField } from "@/components/site/AuthCard";

export default function CadastroPage() {
  return (
    <AuthCard
      title="Crie sua conta grátis"
      subtitle="9 dias grátis, sem cartão de crédito. Nome, e-mail e senha — só isso."
      submitLabel="Criar minha conta"
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
