// Single source of truth for every AI provider POSTime knows about, across every
// category. Drives the "Central de Provedores de IA" (app/app/provedores) — the
// provider list, its onboarding copy, and which ones are actually wired to a real
// "Conectar API" backend all come from here, so adding/removing a provider or
// changing a link never requires touching more than this file.
import type { LlmProvider } from "./generate-roteiros";

// Image/video generation categories were removed (2026-07-27) — POSTime sticks to
// the Ken Burns render (photos + camera movement, ~zero AI cost) as the core
// product instead of chasing paid-per-second AI video generation, which would
// break the free tier's economics. See project memory if reconsidering this.
// Voice (2026-07-27) was also removed — narrating with AI voice is just a link to
// elevenlabs.io on the Gravação page now (generate there, upload the MP3 here)
// instead of a BYOK connection with no real function behind it.
export type ProviderCategory = "texto";

export const CATEGORY_META: Record<ProviderCategory, { label: string; icon: string; description: string }> = {
  texto: {
    label: "Texto",
    icon: "typography",
    description: "Gera os roteiros dos seus vídeos.",
  },
};

export type ProviderTier = "free" | "freeCredits" | "paid" | "enterprise";

export const TIER_META: Record<ProviderTier, { label: string }> = {
  free: { label: "Gratuito para começar" },
  freeCredits: { label: "Créditos grátis" },
  paid: { label: "Pago" },
  enterprise: { label: "Enterprise" },
};

export type ProviderInfo = {
  id: string;
  category: ProviderCategory;
  name: string;
  description: string;
  tiers: ProviderTier[];
  difficulty: "Fácil" | "Média";
  setupTime: string;
  recommended?: boolean;
  notes?: string;
  /** Whether "Conectar API" actually saves+validates a key today. False = roadmap-only; the card still shows the guided onboarding, just no key field yet. */
  implemented: boolean;
  /** Only set when implemented — the exact model POSTime calls with this provider's key, shown after a successful connection. */
  modelLabel?: string;
  signupUrl: string;
  apiKeyUrl: string;
  steps: string[];
};

export const PROVIDERS: ProviderInfo[] = [
  // ---- Texto (implementado — usa o BYOK real de lib/ai/generate-roteiros.ts) ----
  {
    id: "google",
    category: "texto",
    name: "Google Gemini",
    description: "Modelo rápido do Google, com uma das melhores camadas gratuitas do mercado.",
    tiers: ["free"],
    difficulty: "Fácil",
    setupTime: "~3 min",
    recommended: true,
    implemented: true,
    modelLabel: "Gemini 3.5 Flash",
    signupUrl: "https://aistudio.google.com/",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    steps: [
      "Acesse o Google AI Studio e faça login com sua conta Google.",
      "Clique em \"Get API key\" no menu lateral.",
      "Clique em \"Create API key\" e escolha um projeto (ou crie um novo).",
      "Copie a chave gerada.",
      "Volte ao POSTime e cole a chave em \"Conectar API\".",
    ],
  },
  {
    id: "groq",
    category: "texto",
    name: "Groq",
    description: "Infraestrutura de inferência ultrarrápida, rodando modelos open-source.",
    tiers: ["free"],
    difficulty: "Fácil",
    setupTime: "~2 min",
    recommended: true,
    implemented: true,
    modelLabel: "openai/gpt-oss-120b (via Groq)",
    notes: "É o mesmo motor que já gera seus roteiros grátis no plano Free do POSTime — conectar sua própria chave remove o limite de 18 gerações.",
    signupUrl: "https://console.groq.com/",
    apiKeyUrl: "https://console.groq.com/keys",
    steps: [
      "Acesse o GroqCloud Console e crie uma conta gratuita.",
      "No menu lateral, abra \"API Keys\".",
      "Clique em \"Create API Key\", dê um nome e confirme.",
      "Copie a chave — ela só é exibida uma vez.",
      "Volte ao POSTime e cole a chave em \"Conectar API\".",
    ],
  },
  {
    id: "openai",
    category: "texto",
    name: "OpenAI",
    description: "Modelos GPT da OpenAI, muito usados e bem documentados.",
    tiers: ["paid"],
    difficulty: "Fácil",
    setupTime: "~5 min",
    implemented: true,
    modelLabel: "GPT-4.1 mini",
    notes: "Exige cartão cadastrado na conta da OpenAI — não tem uso gratuito contínuo.",
    signupUrl: "https://platform.openai.com/",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    steps: [
      "Acesse a OpenAI Platform e crie uma conta.",
      "Cadastre um cartão em \"Billing\" e adicione créditos.",
      "Abra \"API keys\" no menu lateral.",
      "Clique em \"Create new secret key\" e copie o valor.",
      "Volte ao POSTime e cole a chave em \"Conectar API\".",
    ],
  },
  {
    id: "anthropic",
    category: "texto",
    name: "Anthropic Claude",
    description: "Modelos Claude da Anthropic, bons em seguir instruções longas com precisão.",
    tiers: ["freeCredits", "paid"],
    difficulty: "Fácil",
    setupTime: "~5 min",
    implemented: true,
    modelLabel: "Claude Haiku 4.5",
    notes: "Contas novas ganham um pequeno crédito grátis para testar; depois disso é pago.",
    signupUrl: "https://console.anthropic.com/",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    steps: [
      "Acesse o Anthropic Console e crie uma conta.",
      "Abra \"API Keys\" no menu lateral.",
      "Clique em \"Create Key\", dê um nome e confirme.",
      "Copie a chave gerada.",
      "Volte ao POSTime e cole a chave em \"Conectar API\".",
    ],
  },
];

export function providersByCategory(category: ProviderCategory): ProviderInfo[] {
  return PROVIDERS.filter((p) => p.category === category);
}

export function isTextoProvider(id: string): id is LlmProvider {
  return PROVIDERS.some((p) => p.category === "texto" && p.id === id);
}
