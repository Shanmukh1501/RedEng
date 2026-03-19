import { GoogleGenerativeAI } from "@google/generative-ai";
import { TranslationProvider } from "../types";

export function createGeminiProvider(): TranslationProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);

  return {
    name: "gemini",
    displayName: "Gemini 2.5 Flash",
    async translate(
      textMap: Record<string, string>,
      systemPrompt: string
    ): Promise<Record<string, string>> {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-preview-05-20",
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      });

      const userPrompt = `${systemPrompt}\n\nInput JSON:\n${JSON.stringify(textMap)}`;

      const result = await model.generateContent(userPrompt);
      const responseText = result.response.text();

      try {
        return JSON.parse(responseText);
      } catch {
        throw new Error(
          "Gemini returned invalid JSON. Response: " +
            responseText.slice(0, 200)
        );
      }
    },
  };
}
