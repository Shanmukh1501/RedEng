import Anthropic from "@anthropic-ai/sdk";
import { TranslationProvider } from "../types";

export function createAnthropicProvider(): TranslationProvider | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  return {
    name: "anthropic",
    displayName: "Claude Haiku 4.5",
    async translate(
      textMap: Record<string, string>,
      systemPrompt: string
    ): Promise<Record<string, string>> {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 16384,
        temperature: 0.3,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: `Input JSON:\n${JSON.stringify(textMap)}\n\nReturn ONLY the translated JSON object, nothing else.`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Anthropic returned no text content");
      }

      // Extract JSON from response (Claude sometimes wraps in markdown code blocks)
      let jsonStr = textBlock.text.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      try {
        return JSON.parse(jsonStr);
      } catch {
        throw new Error(
          "Anthropic returned invalid JSON. Response: " +
            jsonStr.slice(0, 200)
        );
      }
    },
  };
}
