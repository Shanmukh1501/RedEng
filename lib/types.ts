export interface RedditComment {
  id: string;
  author: string;
  text: string;
  originalText: string;
  score: number;
  createdUtc: number;
  replies: RedditComment[];
  moreCount?: number;
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

export interface TranslateRequest {
  url: string;
  provider: ProviderName;
}

export interface TranslateResponse {
  post: RedditPost;
  provider: ProviderName;
  translationTimeMs: number;
}

export interface TranslateError {
  error: string;
  details?: string;
}
