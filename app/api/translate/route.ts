import { NextRequest, NextResponse } from "next/server";
import { isValidRedditUrl, fetchRedditPost } from "@/lib/reddit";
import { translatePost } from "@/lib/translator";
import { ProviderName, TranslateError, TranslateResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, provider } = body as {
      url?: string;
      provider?: ProviderName;
    };

    if (!url || typeof url !== "string") {
      return NextResponse.json<TranslateError>(
        { error: "Missing or invalid URL" },
        { status: 400 }
      );
    }

    if (!isValidRedditUrl(url)) {
      return NextResponse.json<TranslateError>(
        {
          error: "Invalid Reddit URL",
          details:
            "URL must be a Reddit post link (e.g., https://www.reddit.com/r/india/comments/...)",
        },
        { status: 400 }
      );
    }

    const providerName: ProviderName = provider || "gemini";
    const validProviders: ProviderName[] = ["gemini", "openai", "anthropic"];
    if (!validProviders.includes(providerName)) {
      return NextResponse.json<TranslateError>(
        { error: `Invalid provider. Choose from: ${validProviders.join(", ")}` },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // Fetch Reddit data
    const post = await fetchRedditPost(url);

    // Translate
    const translatedPost = await translatePost(post, providerName);

    const translationTimeMs = Date.now() - startTime;

    return NextResponse.json<TranslateResponse>({
      post: translatedPost,
      provider: providerName,
      translationTimeMs,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    console.error("Translation error:", error);

    return NextResponse.json<TranslateError>(
      { error: message },
      { status: 500 }
    );
  }
}
