import { generateText, Output } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { MUSIC_MOODS } from "@/lib/audio/moods";

export type LlmProvider = "google" | "openai" | "anthropic" | "groq";

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  google: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
  groq: "Groq",
};

const roteiroItemSchema = z.object({
  meta: z.string().describe("Rótulo curto do tema em maiúsculas, ex: 'TEMA 01 · GANCHO FORTE'"),
  text: z.string().describe("O texto do roteiro em português, pronto para narração"),
  mood: z
    .enum(MUSIC_MOODS)
    .describe(
      "Clima predominante do roteiro, para escolher a música de fundo do vídeo: " +
        "motivacional (superação, conquista, virada de jogo), calmo (bem-estar, reflexão, autocuidado), " +
        "corporativo (produtividade, carreira, negócios, dicas práticas neutras) ou animado (humor, curiosidades, entretenimento leve).",
    ),
  imageQuery: z
    .string()
    .describe(
      "3 a 6 palavras-chave EM INGLÊS, concretas e visuais (não traduza o texto do roteiro), " +
        "descrevendo a cena/imagem que melhor representa este roteiro para uma busca em banco de imagens " +
        "(ex: 'woman meditating sunrise beach', 'busy office team laptop meeting').",
    ),
  tiktokTitle: z
    .string()
    .describe(
      "Um título/gancho curto e chamativo pro vídeo no TikTok, em português, até 60 caracteres — " +
        "diferente do 'meta' (que é só um rótulo interno): este é pra prender atenção de verdade, " +
        "pode usar uma pergunta, um número ou uma afirmação ousada relacionada ao conteúdo do roteiro.",
    ),
  tiktokCaption: z
    .string()
    .describe(
      "Legenda pronta pra colar na descrição do post no TikTok, em português, 2 a 4 frases curtas: " +
        "amplia o gancho do título, entrega valor ou curiosidade extra sobre o tema, e termina com uma " +
        "chamada pra engajamento (pergunta, 'comenta aqui', 'salva pra depois', 'segue pra mais'). " +
        "Não repita o texto do roteiro palavra por palavra — é uma legenda, não uma transcrição.",
    ),
  tiktokHashtags: z
    .array(z.string())
    .describe(
      "6 a 8 hashtags pro TikTok, SEM o caractere '#', minúsculas, sem espaço dentro de cada uma. " +
        "Misture: 2 ou 3 amplas/genéricas de alcance (ex: 'fyp', 'foryou', 'viral', 'aprenda'), e o " +
        "restante específicas do tema/nicho deste roteiro (nada genérico repetido — pense no assunto " +
        "real do conteúdo). Evite hashtags de marca ou de terceiros.",
    ),
});

export function resolveModel(provider: LlmProvider, apiKey: string, modelOverride?: string) {
  switch (provider) {
    case "google":
      return createGoogleGenerativeAI({ apiKey })(modelOverride || "gemini-3.5-flash");
    case "openai":
      return createOpenAI({ apiKey })("gpt-4.1-mini");
    case "anthropic":
      return createAnthropic({ apiKey })("claude-haiku-4-5");
    case "groq":
      // Structured output (json_schema) is currently only supported by the gpt-oss models on Groq.
      return createGroq({ apiKey })(modelOverride || "openai/gpt-oss-120b");
  }
}

const DURATION_WORDS: Record<"15s" | "30s", string> = {
  "15s": "35 a 55 palavras (para leitura em aproximadamente 15 segundos)",
  "30s": "70 a 110 palavras (para leitura em aproximadamente 30 segundos)",
};

export async function generateRoteiros(opts: {
  provider: LlmProvider;
  apiKey: string;
  qty: number;
  duration: "15s" | "30s";
  sourceHint: string;
  sourceIsRealContent: boolean;
  /** Only meaningful for "groq"/"google" — overrides the free-tier pool-key model (see lib/ai/config.ts). Ignored for BYOK providers. */
  modelOverride?: string;
}) {
  const model = resolveModel(opts.provider, opts.apiKey, opts.modelOverride);

  const prompt = [
    "Você é um roteirista especializado em vídeos curtos para TikTok em português do Brasil.",
    `Gere exatamente ${opts.qty} roteiro(s) distintos, cada um com ${DURATION_WORDS[opts.duration]}.`,
    "Cada roteiro deve ter um gancho forte nos primeiros segundos e terminar com uma chamada para engajamento (comentário, seguir, compartilhar).",
    opts.sourceIsRealContent
      ? `Baseie os roteiros no seguinte conteúdo fonte:\n"""${opts.sourceHint.slice(0, 6000)}"""`
      : `Não há um conteúdo-fonte completo disponível — use apenas este tema/indício como ponto de partida e gere roteiros originais e úteis sobre ele: "${opts.sourceHint || "conteúdo genérico de curiosidades e dicas para redes sociais"}"`,
    "Responda em português do Brasil, tom direto e natural para vídeo falado. Cada roteiro deve ser diferente dos outros (ângulos, ganchos ou exemplos distintos).",
    "Para cada roteiro, gere também um título/gancho pro TikTok (tiktokTitle), uma legenda pronta pra postar (tiktokCaption) e as hashtags (tiktokHashtags) — sejam criativos e específicos do conteúdo real de cada roteiro, nunca genéricos ou repetidos entre os roteiros.",
  ].join("\n\n");

  const { output } = await generateText({
    model,
    prompt,
    output: Output.array({ element: roteiroItemSchema }),
    abortSignal: AbortSignal.timeout(55_000),
  });

  return output.slice(0, opts.qty);
}
