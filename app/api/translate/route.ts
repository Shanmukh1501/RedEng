import { NextRequest, NextResponse } from "next/server";
import { translateChunk } from "@/lib/translator";
import {
  ProviderName,
  TranslateChunkRequest,
  TranslateChunkResponse,
  TranslateError,
} from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TranslateChunkRequest;
    const { textMap, provider } = body;

    // Validate textMap
    if (!textMap || typeof textMap !== "object" || Array.isArray(textMap)) {
      return NextResponse.json<TranslateError>(
        { error: "Missing or invalid textMap. Expected a JSON object." },
        { status: 400 }
      );
    }

    const keyCount = Object.keys(textMap).length;
    if (keyCount === 0) {
      return NextResponse.json<TranslateChunkResponse>({ translations: {} });
    }

    if (keyCount > 50) {
      return NextResponse.json<TranslateError>(
        {
          error: "Chunk too large. Max 50 keys per request.",
          details: `Received ${keyCount} keys. Split into smaller chunks client-side.`,
        },
        { status: 400 }
      );
    }

    // Validate provider
    const providerName: ProviderName = provider || "gemini";
    const validProviders: ProviderName[] = ["gemini", "openai", "anthropic"];
    if (!validProviders.includes(providerName)) {
      return NextResponse.json<TranslateError>(
        {
          error: `Invalid provider. Choose from: ${validProviders.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Translate this single chunk
    const translations = await translateChunk(textMap, providerName);

    return NextResponse.json<TranslateChunkResponse>({ translations });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Translation chunk error:", error);

    return NextResponse.json<TranslateError>(
      { error: message },
      { status: 500 }
    );
  }
}
