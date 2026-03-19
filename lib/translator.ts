import { ProviderName, RedditPost, TranslationProvider } from "./types";
import { flattenTextMap, injectTranslations } from "./reddit";
import { createGeminiProvider } from "./providers/gemini";
import { createOpenAIProvider } from "./providers/openai";
import { createAnthropicProvider } from "./providers/anthropic";

const SYSTEM_PROMPT = `You are an expert bilingual translator specializing in Hindi, Hinglish (Romanized Hindi written in Latin script), and English. You deeply understand Indian internet culture, Reddit slang, memes, and colloquial expressions.

You will receive a JSON object where keys are IDs and values are Reddit post/comment texts.

Your task:
1. Translate all Hindi and Hinglish text into natural, native-flowing English.
2. If the text is already in English, return it COMPLETELY UNCHANGED.
3. For code-switched text (mixed Hindi/English), translate ONLY the non-English parts while keeping the English parts intact, then make the full sentence flow naturally in English.
4. Maintain the original tone exactly — sarcasm, humor, anger, excitement, sadness, mockery, etc.
5. Preserve Reddit formatting (markdown, line breaks, bullet points).
6. Translate slang to equivalent English internet slang where appropriate (e.g., "yaar" → "dude/man", "bhai" → "bro").
7. If text contains names, places, or proper nouns in Hindi, transliterate them to English.
8. Keep [deleted] and [removed] as-is.

Return ONLY a valid JSON object with the same keys and translated values. No extra text, no explanations.`;

// Rough token estimation: ~4 chars per token for English, ~3 for Hindi/mixed
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

const MAX_TOKENS_PER_CHUNK = 60000;

function chunkTextMap(
  textMap: Record<string, string>
): Record<string, string>[] {
  const entries = Object.entries(textMap);
  const chunks: Record<string, string>[] = [];
  let currentChunk: Record<string, string> = {};
  let currentTokens = 0;

  for (const [key, value] of entries) {
    const entryTokens = estimateTokens(value) + estimateTokens(key) + 10;

    if (
      currentTokens + entryTokens > MAX_TOKENS_PER_CHUNK &&
      Object.keys(currentChunk).length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = {};
      currentTokens = 0;
    }

    currentChunk[key] = value;
    currentTokens += entryTokens;
  }

  if (Object.keys(currentChunk).length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function getProvider(name: ProviderName): TranslationProvider {
  const providers: Record<
    ProviderName,
    () => TranslationProvider | null
  > = {
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
  if (gemini) results.push({ name: gemini.name, displayName: gemini.displayName });

  const openai = createOpenAIProvider();
  if (openai) results.push({ name: openai.name, displayName: openai.displayName });

  const anthropic = createAnthropicProvider();
  if (anthropic)
    results.push({ name: anthropic.name, displayName: anthropic.displayName });

  return results;
}

export async function translatePost(
  post: RedditPost,
  providerName: ProviderName
): Promise<RedditPost> {
  const provider = getProvider(providerName);
  const textMap = flattenTextMap(post);

  // Nothing to translate
  if (Object.keys(textMap).length === 0) return post;

  const chunks = chunkTextMap(textMap);

  // Translate all chunks (in parallel if multiple)
  const translatedChunks = await Promise.all(
    chunks.map((chunk) => provider.translate(chunk, SYSTEM_PROMPT))
  );

  // Merge all translated chunks
  const mergedTranslations = Object.assign({}, ...translatedChunks);

  return injectTranslations(post, mergedTranslations);
}
