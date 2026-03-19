import { ProviderName, TranslationProvider } from "./types";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAIProvider } from "./providers/openai";
import { createAnthropicProvider } from "./providers/anthropic";

const SYSTEM_PROMPT = `You are an expert translator specializing in Hindi, Hinglish (Romanized Hindi written in Latin script), and English. You are deeply immersed in Indian Gen-Z internet culture and understand the slang, humor, and tone of subreddits like r/india, r/mumbai, r/delhi, r/bollywood, r/IndianGaming, r/TotalKalesh, r/IndiaSpeaks, and similar Indian communities.

You will receive a JSON object where keys are IDs and values are Reddit post/comment texts.

TRANSLATION RULES:
1. Translate the VIBE and INTENT, not literal word-for-word. Example: "Bhai kya kar raha hai tu" → "Bro, what are you even doing?" (NOT "Brother what doing are you")
2. If text is already in standard English, return it COMPLETELY UNTOUCHED. Do not rephrase, improve, or alter English text.
3. For code-switched text (mixed Hindi+English in one sentence), translate ONLY the Hindi/Hinglish portions, then stitch the full sentence so it flows naturally in English.
4. PRESERVE the exact original tone — sarcasm, humor, anger, excitement, mockery, sadness, passive-aggressiveness. Indian internet humor is sharp; keep it sharp.
5. Translate slang to equivalent English internet slang: "yaar/yar" → "dude/man", "bhai" → "bro", "arre" → "oh come on", "accha" → "ah okay/right", "kya matlab" → "what do you mean", etc.
6. Preserve ALL Reddit markdown formatting (bold, italic, links, bullet points, line breaks, headers).
7. Preserve ALL emojis exactly as-is.
8. Transliterate names, places, and proper nouns from Devanagari to English (e.g., "मुंबई" → "Mumbai").
9. Keep [deleted] and [removed] as-is — do NOT translate them.
10. If a comment is just an emoji or a single English word/phrase, return it unchanged.

Return ONLY a valid JSON object with the EXACT same keys and translated values. No wrapping, no markdown code blocks, no explanations.`;

function getProvider(name: ProviderName): TranslationProvider {
  const providers: Record<ProviderName, () => TranslationProvider | null> = {
    gemini: createGeminiProvider,
    openai: createOpenAIProvider,
    anthropic: createAnthropicProvider,
  };

  const creator = providers[name];
  if (!creator) throw new Error(`Unknown provider: ${name}`);

  const provider = creator();
  if (!provider) {
    throw new Error(
      `Provider "${name}" is not configured. Set the appropriate API key in .env.local`
    );
  }
  return provider;
}

export function getAvailableProviders(): {
  name: ProviderName;
  displayName: string;
}[] {
  const results: { name: ProviderName; displayName: string }[] = [];

  const gemini = createGeminiProvider();
  if (gemini)
    results.push({ name: gemini.name, displayName: gemini.displayName });

  const openai = createOpenAIProvider();
  if (openai)
    results.push({ name: openai.name, displayName: openai.displayName });

  const anthropic = createAnthropicProvider();
  if (anthropic)
    results.push({ name: anthropic.name, displayName: anthropic.displayName });

  return results;
}

/**
 * Translate a single chunk of text.
 * Called once per serverless invocation — keeps execution under 10s.
 */
export async function translateChunk(
  textMap: Record<string, string>,
  providerName: ProviderName
): Promise<Record<string, string>> {
  if (Object.keys(textMap).length === 0) return {};

  const provider = getProvider(providerName);
  return provider.translate(textMap, SYSTEM_PROMPT);
}
