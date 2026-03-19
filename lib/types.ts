export interface RedditComment {
  id: string;
  author: string;
  text: string;
  originalText: string;
  score: number;
  createdUtc: number;
  replies: RedditComment[];
  moreCount?: number;
  isTranslated?: boolean;
}

export interface RedditPost {
  id: string;
  title: string;
  originalTitle: string;
  text: string;
  originalText: string;
  author: string;
  score: number;
  subreddit: string;
  numComments: number;
  createdUtc: number;
  permalink: string;
  url: string;
  comments: RedditComment[];
}

export type ProviderName = "gemini" | "openai" | "anthropic";

export interface TranslationProvider {
  name: ProviderName;
  displayName: string;
  translate(
    textMap: Record<string, string>,
    systemPrompt: string
  ): Promise<Record<string, string>>;
}

// New API contract: client sends a single chunk of text to translate
export interface TranslateChunkRequest {
  textMap: Record<string, string>;
  provider: ProviderName;
}

export interface TranslateChunkResponse {
  translations: Record<string, string>;
}

export interface TranslateError {
  error: string;
  details?: string;
}

// Client-side progressive state
export type AppState =
  | { status: "idle" }
  | { status: "fetching_reddit" }
  | {
      status: "displaying_original";
      post: RedditPost;
      provider: ProviderName;
    }
  | {
      status: "translating";
      post: RedditPost;
      provider: ProviderName;
      totalChunks: number;
      completedChunks: number;
    }
  | {
      status: "done";
      post: RedditPost;
      provider: ProviderName;
      translationTimeMs: number;
    }
  | { status: "error"; message: string; details?: string };
