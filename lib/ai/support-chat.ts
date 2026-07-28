import { generateText } from "ai";
import { resolveModel, type LlmProvider } from "./generate-roteiros";
import { SUPPORT_SYSTEM_PROMPT } from "./support-knowledge";

export type SupportChatMessage = { role: "user" | "assistant"; content: string };

export async function generateSupportReply(opts: {
  provider: LlmProvider;
  apiKey: string;
  messages: SupportChatMessage[];
}): Promise<string> {
  const model = resolveModel(opts.provider, opts.apiKey);
  const { text } = await generateText({
    model,
    system: SUPPORT_SYSTEM_PROMPT,
    messages: opts.messages,
    abortSignal: AbortSignal.timeout(55_000),
  });
  return text;
}
