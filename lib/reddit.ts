import { RedditComment, RedditPost } from "./types";

// ============================================================
// URL Utilities
// ============================================================

function normalizeRedditUrl(url: string): string {
  let normalized = url.trim();
  normalized = normalized.replace(/\/+$/, "");
  normalized = normalized.replace(
    /^https?:\/\/(old\.|www\.)?reddit\.com/,
    "https://www.reddit.com"
  );
  normalized = normalized.split("?")[0].split("#")[0];
  return normalized;
}

export function isValidRedditUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return (
      /^(old\.|www\.)?reddit\.com$/.test(parsed.hostname) &&
      /\/r\/\w+\/comments\/\w+/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

// ============================================================
// Reddit JSON Parser (client-safe, no server deps)
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseComment(commentData: any): RedditComment | null {
  // Only process t1 (comment) nodes, skip everything else
  if (!commentData || commentData.kind !== "t1") return null;
  const data = commentData.data;
  if (!data) return null;

  const replies: RedditComment[] = [];
  let moreCount = 0;

  // CRITICAL: Reddit's `replies` is a shape-shifter.
  // - No replies: replies = "" (empty string)
  // - Has replies: replies = { kind: "Listing", data: { children: [...] } }
  // We must check typeof before recursing.
  if (
    data.replies &&
    typeof data.replies === "object" &&
    data.replies.data &&
    Array.isArray(data.replies.data.children)
  ) {
    for (const child of data.replies.data.children) {
      if (child.kind === "more") {
        moreCount += child.data?.count || 0;
        continue;
      }
      const parsed = parseComment(child);
      if (parsed) replies.push(parsed);
    }
  }

  return {
    id: data.id || data.name,
    author: data.author || "[deleted]",
    text: data.body || "",
    originalText: data.body || "",
    score: data.score ?? 0,
    createdUtc: data.created_utc || 0,
    replies,
    moreCount: moreCount > 0 ? moreCount : undefined,
    isTranslated: false,
  };
}

/**
 * Parse raw Reddit JSON (the two-element array) into a clean RedditPost.
 * This is client-safe — no fetch, no server deps.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseRedditJson(json: any): RedditPost {
  if (!Array.isArray(json) || json.length < 2) {
    throw new Error("Unexpected Reddit response format");
  }

  // Index 0 = Post Listing, Index 1 = Comments Listing
  const postData = json[0]?.data?.children?.[0]?.data;
  if (!postData) {
    throw new Error("Could not find post data in Reddit response");
  }

  const comments: RedditComment[] = [];
  let topLevelMoreCount = 0;
  const commentChildren = json[1]?.data?.children || [];

  for (const child of commentChildren) {
    if (child.kind === "more") {
      topLevelMoreCount += child.data?.count || 0;
      continue;
    }
    const parsed = parseComment(child);
    if (parsed) comments.push(parsed);
  }

  // Derive the normalized URL from permalink
  const permalink = postData.permalink || "";
  const url = permalink
    ? `https://www.reddit.com${permalink}`.replace(/\/+$/, "")
    : "";

  return {
    id: postData.id || postData.name,
    title: postData.title || "",
    originalTitle: postData.title || "",
    text: postData.selftext || "",
    originalText: postData.selftext || "",
    author: postData.author || "[deleted]",
    score: postData.score ?? 0,
    subreddit: postData.subreddit || "",
    numComments: postData.num_comments ?? 0,
    createdUtc: postData.created_utc || 0,
    permalink,
    url,
    comments: attachTopLevelMoreCount(comments, topLevelMoreCount),
  };
}

function attachTopLevelMoreCount(
  comments: RedditComment[],
  moreCount: number
): RedditComment[] {
  // If there are hidden top-level comments, attach the count to the last comment
  if (moreCount > 0 && comments.length > 0) {
    const last = comments[comments.length - 1];
    comments[comments.length - 1] = {
      ...last,
      moreCount: (last.moreCount || 0) + moreCount,
    };
  }
  return comments;
}

/**
 * Fetch Reddit post JSON from the browser (client-side).
 * Uses the user's residential IP to avoid datacenter bans.
 */
export async function fetchRedditJsonFromBrowser(
  url: string
): Promise<RedditPost> {
  const normalizedUrl = normalizeRedditUrl(url);
  const jsonUrl = `${normalizedUrl}.json?limit=500&raw_json=1`;

  const response = await fetch(jsonUrl, {
    headers: {
      // Browser will add its own User-Agent, but we set one for clarity
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "Reddit rate limit reached. Please try again in a minute."
      );
    }
    if (response.status === 403) {
      throw new Error(
        "Reddit blocked this request. Try refreshing the page."
      );
    }
    throw new Error(
      `Reddit returned ${response.status}: ${response.statusText}`
    );
  }

  const json = await response.json();
  return parseRedditJson(json);
}

// ============================================================
// Text Map: Extract, Chunk, Inject
// ============================================================

/**
 * Extract all translatable text into a flat map.
 * Skips [deleted], [removed], and empty text to save LLM tokens.
 */
export function flattenTextMap(post: RedditPost): Record<string, string> {
  const map: Record<string, string> = {};
  const SKIP_VALUES = new Set(["[deleted]", "[removed]", ""]);

  if (post.title && !SKIP_VALUES.has(post.title)) {
    map[`title_${post.id}`] = post.title;
  }
  if (post.text && !SKIP_VALUES.has(post.text)) {
    map[`body_${post.id}`] = post.text;
  }

  function extractComments(comments: RedditComment[]) {
    for (const c of comments) {
      if (
        c.text &&
        !SKIP_VALUES.has(c.text) &&
        c.author !== "[deleted]"
      ) {
        map[`comment_${c.id}`] = c.text;
      }
      extractComments(c.replies);
    }
  }

  extractComments(post.comments);
  return map;
}

/**
 * Chunk a flat text map into batches of maxKeys entries.
 * This runs client-side. Each chunk becomes one API request.
 * Max 30-40 keys keeps each LLM call fast and prevents truncation.
 */
export function chunkTextMap(
  textMap: Record<string, string>,
  maxKeys: number = 35
): Record<string, string>[] {
  const entries = Object.entries(textMap);
  const chunks: Record<string, string>[] = [];

  for (let i = 0; i < entries.length; i += maxKeys) {
    const slice = entries.slice(i, i + maxKeys);
    chunks.push(Object.fromEntries(slice));
  }

  return chunks;
}

/**
 * Inject a partial set of translations into a post.
 * Called progressively as each chunk resolves.
 * Only overwrites fields that exist in the translations map.
 */
export function injectTranslations(
  post: RedditPost,
  translations: Record<string, string>
): RedditPost {
  const translated = { ...post };

  const titleKey = `title_${post.id}`;
  if (titleKey in translations) {
    translated.title = translations[titleKey];
  }

  const bodyKey = `body_${post.id}`;
  if (bodyKey in translations) {
    translated.text = translations[bodyKey];
  }

  function injectComments(comments: RedditComment[]): RedditComment[] {
    return comments.map((c) => {
      const key = `comment_${c.id}`;
      const hasTranslation = key in translations;
      return {
        ...c,
        text: hasTranslation ? translations[key] : c.text,
        isTranslated: c.isTranslated || hasTranslation,
        replies: injectComments(c.replies),
      };
    });
  }

  translated.comments = injectComments(post.comments);
  return translated;
}
