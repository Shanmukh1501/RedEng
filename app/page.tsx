"use client";

import { useRef, useState } from "react";
import { URLInput } from "@/components/url-input";
import { TranslatedPost } from "@/components/translated-post";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import {
  AppState,
  ProviderName,
  RedditPost,
  TranslateChunkResponse,
} from "@/lib/types";
import {
  fetchRedditJsonFromBrowser,
  flattenTextMap,
  chunkTextMap,
  injectTranslations,
} from "@/lib/reddit";

const PROVIDER_DISPLAY: Record<ProviderName, string> = {
  gemini: "Gemini 3 Flash",
  openai: "GPT-4.1 Mini",
  anthropic: "Claude Haiku 4.5",
};

export default function Home() {
  const [state, setState] = useState<AppState>({ status: "idle" });
  // Use a ref to accumulate translations across async chunk callbacks
  // so we always merge into the latest post state without stale closures.
  const postRef = useRef<RedditPost | null>(null);
  const translationsRef = useRef<Record<string, string>>({});

  async function handleTranslate(url: string, provider: ProviderName) {
    // Reset refs
    postRef.current = null;
    translationsRef.current = {};

    // Phase 1: Fetch Reddit data from the browser (user's IP)
    setState({ status: "fetching_reddit" });

    let post: RedditPost;
    try {
      post = await fetchRedditJsonFromBrowser(url);
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error ? err.message : "Failed to fetch Reddit post",
        details: "Make sure the URL is a valid, public Reddit post.",
      });
      return;
    }

    postRef.current = post;

    // Phase 2: Show the original post immediately
    setState({
      status: "displaying_original",
      post,
      provider,
    });

    // Phase 3: Build flat text map and chunk it
    const textMap = flattenTextMap(post);
    const totalKeys = Object.keys(textMap).length;

    if (totalKeys === 0) {
      // Nothing to translate (all English or empty)
      setState({
        status: "done",
        post,
        provider,
        translationTimeMs: 0,
      });
      return;
    }

    const chunks = chunkTextMap(textMap, 35);
    const startTime = Date.now();
    let completedChunks = 0;

    setState({
      status: "translating",
      post,
      provider,
      totalChunks: chunks.length,
      completedChunks: 0,
    });

    // Phase 4: Fire parallel translation requests, merge progressively
    const chunkPromises = chunks.map(async (chunk, index) => {
      try {
        const response = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ textMap: chunk, provider }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          console.error(`Chunk ${index} failed:`, errData);
          return null;
        }

        const data: TranslateChunkResponse = await response.json();
        return data.translations;
      } catch (err) {
        console.error(`Chunk ${index} network error:`, err);
        return null;
      }
    });

    // As each chunk resolves, merge translations into the post progressively
    const settledResults = await Promise.allSettled(
      chunkPromises.map(async (promise, index) => {
        const translations = await promise;
        if (!translations) return;

        // Merge into accumulated translations
        Object.assign(translationsRef.current, translations);

        // Re-inject ALL accumulated translations into the original post
        const updatedPost = injectTranslations(
          postRef.current!,
          translationsRef.current
        );

        completedChunks++;

        setState({
          status: "translating",
          post: updatedPost,
          provider,
          totalChunks: chunks.length,
          completedChunks,
        });

        return index;
      })
    );

    // Phase 5: Done — final state
    const translationTimeMs = Date.now() - startTime;
    const failedChunks = settledResults.filter(
      (r) => r.status === "rejected"
    ).length;

    // Build final post with all accumulated translations
    const finalPost = injectTranslations(
      postRef.current!,
      translationsRef.current
    );

    if (
      failedChunks === chunks.length &&
      Object.keys(translationsRef.current).length === 0
    ) {
      setState({
        status: "error",
        message: "All translation requests failed",
        details:
          "Check your API key configuration and try again.",
      });
    } else {
      setState({
        status: "done",
        post: finalPost,
        provider,
        translationTimeMs,
      });
    }
  }

  // Derive what to render based on state
  const showPost =
    state.status === "displaying_original" ||
    state.status === "translating" ||
    state.status === "done";

  const isTranslating = state.status === "translating";
  const translationProgress =
    state.status === "translating"
      ? {
          completed: state.completedChunks,
          total: state.totalChunks,
        }
      : null;

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
            isLoading={
              state.status === "fetching_reddit" ||
              state.status === "displaying_original" ||
              state.status === "translating"
            }
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

        {state.status === "fetching_reddit" && <LoadingSkeleton stage="fetching" />}

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

        {showPost && (
          <>
            {/* Translation progress bar */}
            {isTranslating && translationProgress && (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs text-[#818384] mb-1.5">
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-3.5 w-3.5 text-[#ff4500]"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Translating... comments are appearing in English as they&apos;re ready
                  </span>
                  <span>
                    {translationProgress.completed}/{translationProgress.total} chunks
                  </span>
                </div>
                <div className="w-full bg-[#272729] rounded-full h-1.5">
                  <div
                    className="bg-[#ff4500] h-1.5 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${(translationProgress.completed / translationProgress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <TranslatedPost
              post={
                state.status === "displaying_original" ||
                state.status === "translating" ||
                state.status === "done"
                  ? state.post
                  : ({} as RedditPost)
              }
              translationTimeMs={
                state.status === "done" ? state.translationTimeMs : 0
              }
              providerDisplayName={
                "provider" in state ? PROVIDER_DISPLAY[state.provider] : ""
              }
              isDone={state.status === "done"}
            />
          </>
        )}
      </main>
    </div>
  );
}
