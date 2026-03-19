"use client";

import { useState, useCallback, useRef } from "react";
import { RedditPost } from "@/lib/types";
import { Comment } from "./comment";

function timeAgo(utc: number): string {
  const seconds = Math.floor(Date.now() / 1000 - utc);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;
  return `${Math.floor(seconds / 31536000)}y ago`;
}

function formatScore(score: number): string {
  if (score >= 1000) return `${(score / 1000).toFixed(1)}k`;
  return String(score);
}

interface TranslatedPostProps {
  post: RedditPost;
  translationTimeMs: number;
  providerDisplayName: string;
  isDone: boolean;
}

/**
 * Hook for press-and-hold to reveal original text.
 */
function useHoldToReveal(hasTranslation: boolean) {
  const [showOriginal, setShowOriginal] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onPointerDown = useCallback(() => {
    if (!hasTranslation) return;
    holdTimerRef.current = setTimeout(() => setShowOriginal(true), 200);
  }, [hasTranslation]);

  const onPointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setShowOriginal(false);
  }, []);

  const onPointerLeave = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setShowOriginal(false);
  }, []);

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (hasTranslation) e.preventDefault();
    },
    [hasTranslation]
  );

  return { showOriginal, onPointerDown, onPointerUp, onPointerLeave, onContextMenu };
}

export function TranslatedPost({
  post,
  translationTimeMs,
  providerDisplayName,
  isDone,
}: TranslatedPostProps) {
  const hasTitleTranslation = post.title !== post.originalTitle;
  const hasBodyTranslation = post.text !== post.originalText;

  const titleHold = useHoldToReveal(hasTitleTranslation);
  const bodyHold = useHoldToReveal(hasBodyTranslation);

  return (
    <div className="space-y-4">
      {/* Translation info bar — only show when done */}
      {isDone && translationTimeMs > 0 && (
        <div className="flex items-center justify-between text-xs text-[#818384] px-1">
          <span>
            Translated with {providerDisplayName} in{" "}
            {(translationTimeMs / 1000).toFixed(1)}s
          </span>
          <span>
            {post.comments.length} top-level comments · {post.numComments}{" "}
            total
          </span>
        </div>
      )}

      {/* Hold hint */}
      {isDone && (hasTitleTranslation || hasBodyTranslation) && (
        <div className="text-[10px] text-[#818384] px-1 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
          </svg>
          Press and hold translated text to reveal the original
        </div>
      )}

      {/* Post card */}
      <div className="bg-[#1a1a1b] border border-[#343536] rounded-md overflow-hidden">
        {/* Post header */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-1.5 text-xs text-[#818384] mb-2">
            <span className="font-bold text-[#d7dadc]">
              r/{post.subreddit}
            </span>
            <span>·</span>
            <span>Posted by u/{post.author}</span>
            <span>·</span>
            <span>{timeAgo(post.createdUtc)}</span>
          </div>

          {/* Title — press-and-hold for original */}
          <h1
            onPointerDown={titleHold.onPointerDown}
            onPointerUp={titleHold.onPointerUp}
            onPointerLeave={titleHold.onPointerLeave}
            onContextMenu={titleHold.onContextMenu}
            className={`text-lg font-semibold mb-1 transition-colors duration-200 ${
              titleHold.showOriginal
                ? "text-[#a0a0a0] italic"
                : "text-[#d7dadc]"
            } ${hasTitleTranslation ? "cursor-pointer" : ""}`}
          >
            {titleHold.showOriginal ? post.originalTitle : post.title}
          </h1>
          {hasTitleTranslation && (
            <span className="text-[10px] text-[#4fbcff] select-none">
              hold to see original
            </span>
          )}

          {/* Body — press-and-hold for original */}
          {post.text && (
            <div
              onPointerDown={bodyHold.onPointerDown}
              onPointerUp={bodyHold.onPointerUp}
              onPointerLeave={bodyHold.onPointerLeave}
              onContextMenu={bodyHold.onContextMenu}
              className={`mt-2 text-sm whitespace-pre-wrap leading-relaxed transition-colors duration-200 ${
                bodyHold.showOriginal
                  ? "text-[#a0a0a0] italic bg-[#1f1f20] rounded px-2 py-1 -mx-2"
                  : "text-[#d7dadc]"
              } ${hasBodyTranslation ? "cursor-pointer" : ""}`}
            >
              {bodyHold.showOriginal ? post.originalText : post.text}
            </div>
          )}
          {hasBodyTranslation && (
            <span className="text-[10px] text-[#4fbcff] mt-1 inline-block select-none">
              hold to see original
            </span>
          )}
        </div>

        {/* Post footer */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs text-[#818384]">
          <span className="font-semibold">
            {formatScore(post.score)} upvotes
          </span>
          <span>{post.numComments} comments</span>
        </div>
      </div>

      {/* Comments section */}
      <div className="bg-[#1a1a1b] border border-[#343536] rounded-md p-4">
        <div className="text-xs font-semibold text-[#818384] uppercase tracking-wider mb-4">
          Comments
        </div>

        {post.comments.length === 0 ? (
          <p className="text-sm text-[#818384] italic">No comments yet</p>
        ) : (
          <div className="space-y-1">
            {post.comments.map((comment) => (
              <Comment key={comment.id} comment={comment} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
