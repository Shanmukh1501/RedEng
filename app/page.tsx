"use client";

import { useState } from "react";
import { URLInput } from "@/components/url-input";
import { TranslatedPost } from "@/components/translated-post";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ProviderName, RedditPost } from "@/lib/types";

const PROVIDER_DISPLAY: Record<ProviderName, string> = {
  gemini: "Gemini 2.5 Flash",
  openai: "GPT-4.1 Mini",
  anthropic: "Claude Haiku 4.5",
};

type AppState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      post: RedditPost;
      provider: ProviderName;
      translationTimeMs: number;
    }
  | { status: "error"; message: string; details?: string };

export default function Home() {
  const [state, setState] = useState<AppState>({ status: "idle" });

  async function handleTranslate(url: string, provider: ProviderName) {
    setState({ status: "loading" });

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, provider }),
      });

      const data = await response.json();

      if (!response.ok) {
        setState({
          status: "error",
          message: data.error || "Translation failed",
          details: data.details,
        });
        return;
      }

      setState({
        status: "success",
        post: data.post,
        provider: data.provider,
        translationTimeMs: data.translationTimeMs,
      });
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Network error. Please try again.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#030303]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#1a1a1b] border-b border-[#343536]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg
              className="w-8 h-8 text-[#ff4500]"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="12" r="11" fill="currentColor" />
              <circle cx="8.5" cy="10.5" r="1.5" fill="white" />
              <circle cx="15.5" cy="10.5" r="1.5" fill="white" />
              <path
                d="M7 14.5c0 0 2 2.5 5 2.5s5-2.5 5-2.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="19" cy="5" r="2" fill="white" />
              <line
                x1="14"
                y1="3"
                x2="18"
                y2="5"
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>
            <h1 className="text-lg font-bold text-[#d7dadc]">
              Red<span className="text-[#ff4500]">Eng</span>
            </h1>
          </div>
          <span className="text-xs text-[#818384] hidden sm:block">
            Reddit Hinglish → English Translator
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* URL Input */}
        <div className="mb-6">
          <URLInput
            onSubmit={handleTranslate}
            isLoading={state.status === "loading"}
          />
        </div>

        {/* Content area */}
        {state.status === "idle" && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-20">&#x1F310;</div>
            <h2 className="text-xl font-semibold text-[#d7dadc] mb-2">
              Translate Reddit Posts
            </h2>
            <p className="text-sm text-[#818384] max-w-md mx-auto">
              Paste a Reddit post link to get a natural English translation of
              Hindi/Hinglish posts and comments. Works with code-switching,
              internet slang, and mixed languages.
            </p>
          </div>
        )}

        {state.status === "loading" && <LoadingSkeleton />}

        {state.status === "error" && (
          <div className="bg-[#1a1a1b] border border-red-900/50 rounded-md p-6 text-center">
            <div className="text-red-400 font-semibold mb-2">
              {state.message}
            </div>
            {state.details && (
              <p className="text-sm text-[#818384]">{state.details}</p>
            )}
          </div>
        )}

        {state.status === "success" && (
          <TranslatedPost
            post={state.post}
            translationTimeMs={state.translationTimeMs}
            providerDisplayName={PROVIDER_DISPLAY[state.provider]}
          />
        )}
      </main>
    </div>
  );
}
