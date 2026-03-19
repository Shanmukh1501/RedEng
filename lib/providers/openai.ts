import OpenAI from "openai";
import { TranslationProvider } from "../types";

export function createOpenAIProvider(): TranslationProvider | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });

  return {
    name: "openai",
    displayName: "GPT-4.1 Mini",
    async translate(
      textMap: Record<string, string>,
      systemPrompt: string
    ): Promise<Record<string, string>> {
      const response = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        response_format: { type: "json_object" },
        temperature: 0.3,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Input JSON:\n${JSON.stringify(textMap)}`,
          },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("OpenAI returned empty response");

      try {
        return JSON.parse(content);
      } catch {
        throw new Error(
          "OpenAI returned invalid JSON. Response: " + content.slice(0, 200)
        );
      }
    },
  };
}
