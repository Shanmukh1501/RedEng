import { RedditComment, RedditPost } from "./types";

function normalizeRedditUrl(url: string): string {
  let normalized = url.trim();
  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, "");
  // Convert old.reddit.com or www.reddit.com to reddit.com
  normalized = normalized.replace(
    /^https?:\/\/(old\.|www\.)?reddit\.com/,
    "https://www.reddit.com"
  );
  // Remove query params and hash
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseComment(commentData: any): RedditComment | null {
  if (!commentData || commentData.kind !== "t1") return null;
  const data = commentData.data;
  if (!data) return null;

  const replies: RedditComment[] = [];
  let moreCount = 0;

  if (data.replies && data.replies.data && data.replies.data.children) {
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
  };
}

export async function fetchRedditPost(url: string): Promise<RedditPost> {
  const normalizedUrl = normalizeRedditUrl(url);
  const jsonUrl = `${normalizedUrl}.json?limit=500&raw_json=1`;

  const response = await fetch(jsonUrl, {
    headers: {
      "User-Agent": "RedEng/1.0 (Hinglish-to-English Translator)",
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Reddit rate limit reached. Please try again in a minute.");
    }
    throw new Error(`Reddit returned ${response.status}: ${response.statusText}`);
  }

  const json = await response.json();

  if (!Array.isArray(json) || json.length < 2) {
    throw new Error("Unexpected Reddit response format");
  }

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
    permalink: postData.permalink || "",
    url: normalizedUrl,
    comments: appendMoreIndicator(comments, topLevelMoreCount),
  };
}

function appendMoreIndicator(
  comments: RedditComment[],
  moreCount: number
): RedditComment[] {
  // Just pass through — moreCount is tracked per comment node
  if (moreCount > 0 && comments.length > 0) {
    // Attach the top-level more count to a virtual indicator
    // We'll handle this in the UI
  }
  return comments;
}

export function flattenTextMap(post: RedditPost): Record<string, string> {
  const map: Record<string, string> = {};

  if (post.title) map[`title_${post.id}`] = post.title;
  if (post.text) map[`body_${post.id}`] = post.text;

  function extractComments(comments: RedditComment[]) {
    for (const c of comments) {
      if (c.text && c.author !== "[deleted]") {
        map[`comment_${c.id}`] = c.text;
      }
      extractComments(c.replies);
    }
  }

  extractComments(post.comments);
  return map;
}

export function injectTranslations(
  post: RedditPost,
  translations: Record<string, string>
): RedditPost {
  const translated = { ...post };
  translated.title = translations[`title_${post.id}`] || post.title;
  translated.text = translations[`body_${post.id}`] || post.text;

  function injectComments(comments: RedditComment[]): RedditComment[] {
    return comments.map((c) => ({
      ...c,
      text: translations[`comment_${c.id}`] || c.text,
      replies: injectComments(c.replies),
    }));
  }

  translated.comments = injectComments(post.comments);
  return translated;
}
