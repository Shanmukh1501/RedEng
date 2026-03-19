"use client";

import { useState, useCallback, useRef } from "react";
import { RedditComment } from "@/lib/types";

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

interface CommentProps {
  comment: RedditComment;
  depth?: number;
}

export function Comment({ comment, depth = 0 }: CommentProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDeleted =
    comment.author === "[deleted]" || comment.text === "[deleted]";
  const isRemoved = comment.text === "[removed]";
  const hasTranslation =
    comment.isTranslated && comment.text !== comment.originalText;

  // Press-and-hold: show original text while holding on the comment body
  const handlePointerDown = useCallback(() => {
    if (!hasTranslation) return;
    holdTimerRef.current = setTimeout(() => {
      setShowOriginal(true);
    }, 200); // 200ms hold threshold
  }, [hasTranslation]);

  const handlePointerUp = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setShowOriginal(false);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setShowOriginal(false);
  }, []);

  return (
    <div className="relative">
      {/* Thread line */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#343536] hover:bg-[#d7dadc] cursor-pointer transition-colors"
          onClick={() => setCollapsed(!collapsed)}
        />
      )}

      <div className={depth > 0 ? "ml-4" : ""}>
        {/* Comment header */}
        <div className="flex items-center gap-1.5 text-xs py-1.5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-[#818384] hover:text-[#d7dadc] transition-colors font-mono"
          >
            {collapsed ? "[+]" : "[-]"}
          </button>
          <span
            className={`font-semibold ${
              isDeleted
                ? "text-[#818384] italic"
                : "text-[#d7dadc]"
            }`}
          >
            {comment.author}
          </span>
          <span className="text-[#818384]">·</span>
          <span className="text-[#818384]">
            {formatScore(comment.score)} pts
          </span>
          <span className="text-[#818384]">·</span>
          <span className="text-[#818384]">
            {timeAgo(comment.createdUtc)}
          </span>
          {hasTranslation && !collapsed && (
            <>
              <span className="text-[#818384]">·</span>
              <span className="text-[#4fbcff] text-[10px] select-none">
                hold to see original
              </span>
            </>
          )}
        </div>

        {/* Comment body */}
        {!collapsed && (
          <div className="pb-2">
            <div
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onContextMenu={(e) => {
                // Prevent context menu on long press (mobile)
                if (hasTranslation) e.preventDefault();
              }}
              className={`text-sm leading-relaxed whitespace-pre-wrap select-text transition-colors duration-200 ${
                isDeleted || isRemoved
                  ? "text-[#818384] italic"
                  : showOriginal
                    ? "text-[#a0a0a0] italic bg-[#1f1f20] rounded px-2 py-1 -mx-2"
                    : "text-[#d7dadc]"
              } ${hasTranslation ? "cursor-pointer" : ""}`}
            >
              {showOriginal ? comment.originalText : comment.text}
            </div>

            {/* Replies */}
            {comment.replies.length > 0 && (
              <div className="mt-1">
                {comment.replies.map((reply) => (
                  <Comment
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                  />
                ))}
              </div>
            )}

            {/* More comments indicator */}
            {comment.moreCount != null && comment.moreCount > 0 && (
              <div className="text-xs text-[#4fbcff] mt-2 ml-4">
                {comment.moreCount} more{" "}
                {comment.moreCount === 1 ? "reply" : "replies"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
