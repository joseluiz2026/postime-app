// Single source of truth for every AI provider POSTime knows about, across every
// category. Drives the "Central de Provedores de IA" (app/app/provedores) — the
// provider list, its onboarding copy, and which ones are actually wired to a real
// "Conectar API" backend all come from here, so adding/removing a provider or
// changing a link never requires touching more than this file.
import type { LlmProvider } from "./generate-roteiros";

export type ProviderCategory = "texto" | "imagem" | "video" | "voz";

export const CATEGORY_META: Record<ProviderCategory, { label: string; icon: string; description: string }> = {
  texto: {
    label: "Texto",
    icon: "typography",
    description: "Gera os roteiros dos seus vídeos.",
  },
  imagem: {
    label: "Imagem",
    icon: "photo",
    description: "Geração de imagens por IA para as cenas do vídeo.",
  },
  video: {
    label: "Vídeo",
    icon: "movie",
    description: "Geração de vídeo por IA (além do modo Ken Burns gratuito).",
  },
  voz: {
    label: "Voz",
    icon: "microphone-2",
    description: "Narração e clonagem de voz.",
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

  // ---- Imagem (roadmap — hoje o POSTime já busca fotos automaticamente via Pexels, sem BYOK) ----
  {
    id: "fal-image",
    category: "imagem",
    name: "Fal.ai (Flux)",
    description: "Geração de imagens com o modelo Flux, via API unificada da Fal.ai.",
    tiers: ["freeCredits", "paid"],
    difficulty: "Fácil",
    setupTime: "~4 min",
    recommended: true,
    implemented: false,
    notes: "Ainda não disponível no POSTime — em breve, para gerar imagens de cena sob medida em vez de usar apenas bancos de fotos gratuitos.",
    signupUrl: "https://fal.ai/",
    apiKeyUrl: "https://fal.ai/dashboard/keys",
    steps: [
      "Acesse fal.ai e crie uma conta.",
      "Abra o Dashboard e vá em \"Keys\".",
      "Clique em \"Add key\" e copie o valor gerado.",
      "Guarde a chave — no POSTime, ela poderá ser colada assim que este recurso for lançado.",
    ],
  },
  {
    id: "replicate",
    category: "imagem",
    name: "Replicate",
    description: "Catálogo amplo de modelos de imagem hospedados (Flux, SDXL e outros).",
    tiers: ["freeCredits", "paid"],
    difficulty: "Média",
    setupTime: "~5 min",
    implemented: false,
    notes: "Ainda não disponível no POSTime.",
    signupUrl: "https://replicate.com/",
    apiKeyUrl: "https://replicate.com/account/api-tokens",
    steps: [
      "Acesse replicate.com e crie uma conta.",
      "Vá em Account settings → \"API tokens\".",
      "Copie o token padrão ou crie um novo.",
      "Guarde a chave para quando este recurso for lançado no POSTime.",
    ],
  },
  {
    id: "huggingface",
    category: "imagem",
    name: "Hugging Face",
    description: "Inference API da Hugging Face, com diversos modelos de imagem abertos.",
    tiers: ["free", "paid"],
    difficulty: "Média",
    setupTime: "~4 min",
    implemented: false,
    notes: "Ainda não disponível no POSTime.",
    signupUrl: "https://huggingface.co/",
    apiKeyUrl: "https://huggingface.co/settings/tokens",
    steps: [
      "Acesse huggingface.co e crie uma conta.",
      "Vá em Settings → \"Access Tokens\".",
      "Clique em \"Create new token\" com permissão de leitura.",
      "Copie o token para quando este recurso for lançado no POSTime.",
    ],
  },

  // ---- Vídeo (roadmap — plano Pro, BYOK conforme decisão do Free/Pro) ----
  {
    id: "fal-video",
    category: "video",
    name: "Fal.ai (Kling / Seedance)",
    description: "API unificada que dá acesso a vários modelos de vídeo por IA com uma única chave.",
    tiers: ["freeCredits", "paid"],
    difficulty: "Fácil",
    setupTime: "~4 min",
    recommended: true,
    implemented: false,
    notes: "Ainda não disponível no POSTime — é o provedor planejado para o plano Pro, para vídeos gerados por IA além do modo Ken Burns gratuito.",
    signupUrl: "https://fal.ai/",
    apiKeyUrl: "https://fal.ai/dashboard/keys",
    steps: [
      "Acesse fal.ai e crie uma conta.",
      "Abra o Dashboard e vá em \"Keys\".",
      "Clique em \"Add key\" e copie o valor gerado.",
      "Guarde a chave para quando este recurso for lançado no POSTime.",
    ],
  },
  {
    id: "kling",
    category: "video",
    name: "Kling AI",
    description: "Geração de vídeo por IA direto na plataforma da Kuaishou.",
    tiers: ["freeCredits", "paid"],
    difficulty: "Média",
    setupTime: "~5 min",
    implemented: false,
    notes: "Ainda não disponível no POSTime.",
    signupUrl: "https://klingai.com/",
    apiKeyUrl: "https://klingai.com/",
    steps: [
      "Acesse klingai.com e crie uma conta.",
      "Abra a área de desenvolvedor/API.",
      "Gere uma chave de API.",
      "Guarde a chave para quando este recurso for lançado no POSTime.",
    ],
  },
  {
    id: "runway",
    category: "video",
    name: "Runway",
    description: "Um dos pioneiros em vídeo generativo por IA, com API própria.",
    tiers: ["paid"],
    difficulty: "Média",
    setupTime: "~5 min",
    implemented: false,
    notes: "Ainda não disponível no POSTime.",
    signupUrl: "https://runwayml.com/",
    apiKeyUrl: "https://dev.runwayml.com/",
    steps: [
      "Acesse runwayml.com e crie uma conta.",
      "Abra o portal de desenvolvedor (dev.runwayml.com).",
      "Gere uma chave de API em \"API Keys\".",
      "Guarde a chave para quando este recurso for lançado no POSTime.",
    ],
  },
  {
    id: "luma",
    category: "video",
    name: "Luma AI",
    description: "Modelos de vídeo generativo (Dream Machine) com API própria.",
    tiers: ["freeCredits", "paid"],
    difficulty: "Média",
    setupTime: "~5 min",
    implemented: false,
    notes: "Ainda não disponível no POSTime.",
    signupUrl: "https://lumalabs.ai/",
    apiKeyUrl: "https://lumalabs.ai/dream-machine/api/keys",
    steps: [
      "Acesse lumalabs.ai e crie uma conta.",
      "Abra a área de API (Dream Machine API).",
      "Gere uma chave de API.",
      "Guarde a chave para quando este recurso for lançado no POSTime.",
    ],
  },

  // ---- Voz (o fluxo de clonagem já existe no passo Roteiros, plano Pro — hoje é uma prévia sem chamada real à ElevenLabs) ----
  {
    id: "elevenlabs",
    category: "voz",
    name: "ElevenLabs",
    description: "Clonagem de voz e narração realista — líder de mercado em voz por IA.",
    tiers: ["freeCredits", "paid"],
    difficulty: "Fácil",
    setupTime: "~3 min",
    recommended: true,
    implemented: false,
    notes: "No passo Roteiros já existe um fluxo \"Conectar minha voz (ElevenLabs)\" no plano Pro — ele ainda é uma prévia (não chama a API de verdade). A conexão real de chave vai migrar para cá quando estiver pronta.",
    signupUrl: "https://elevenlabs.io/",
    apiKeyUrl: "https://elevenlabs.io/app/settings/api-keys",
    steps: [
      "Acesse elevenlabs.io e crie uma conta.",
      "Abra o Profile (canto inferior esquerdo) → \"API Keys\".",
      "Copie a chave exibida (ou gere uma nova).",
      "Guarde a chave — a clonagem de voz com sua própria conta usa esse valor.",
    ],
  },
  {
    id: "cartesia",
    category: "voz",
    name: "Cartesia",
    description: "Voz por IA de baixa latência, focada em narração em tempo real.",
    tiers: ["freeCredits", "paid"],
    difficulty: "Fácil",
    setupTime: "~3 min",
    implemented: false,
    notes: "Ainda não disponível no POSTime.",
    signupUrl: "https://cartesia.ai/",
    apiKeyUrl: "https://play.cartesia.ai/keys",
    steps: [
      "Acesse cartesia.ai e crie uma conta.",
      "Abra o Playground → \"API Keys\".",
      "Gere uma nova chave e copie o valor.",
      "Guarde a chave para quando este recurso for lançado no POSTime.",
    ],
  },
  {
    id: "google-tts",
    category: "voz",
    name: "Google Text-to-Speech",
    description: "Narração via Google Cloud, com vozes em português do Brasil.",
    tiers: ["free", "paid"],
    difficulty: "Média",
    setupTime: "~8 min",
    implemented: false,
    notes: "Ainda não disponível no POSTime — configuração mais técnica (exige um projeto no Google Cloud).",
    signupUrl: "https://cloud.google.com/text-to-speech",
    apiKeyUrl: "https://console.cloud.google.com/apis/credentials",
    steps: [
      "Acesse o Google Cloud Console e crie um projeto.",
      "Ative a API \"Cloud Text-to-Speech\".",
      "Vá em \"Credenciais\" e crie uma chave de API.",
      "Guarde a chave para quando este recurso for lançado no POSTime.",
    ],
  },
];

export function providersByCategory(category: ProviderCategory): ProviderInfo[] {
  return PROVIDERS.filter((p) => p.category === category);
}

export function isTextoProvider(id: string): id is LlmProvider {
  return PROVIDERS.some((p) => p.category === "texto" && p.id === id);
}
