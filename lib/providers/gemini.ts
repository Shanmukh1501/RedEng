import { GoogleGenAI } from "@google/genai";
import { TranslationProvider } from "../types";

export function createGeminiProvider(): TranslationProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });

  return {
    name: "gemini",
    displayName: "Gemini 3 Flash",
    async translate(
      textMap: Record<string, string>,
      systemPrompt: string
    ): Promise<Record<string, string>> {
      const userPrompt = `${systemPrompt}\n\nInput JSON:\n${JSON.stringify(textMap)}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userPrompt,
        config: {
          // Gemini 3 recommends temperature 1.0 — lower values cause looping
          temperature: 1.0,
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Gemini returned an empty response");
      }

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
