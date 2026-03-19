"use client";

import { useState } from "react";
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
}

export function TranslatedPost({
  post,
  translationTimeMs,
  providerDisplayName,
}: TranslatedPostProps) {
  const [showOriginalTitle, setShowOriginalTitle] = useState(false);
  const [showOriginalBody, setShowOriginalBody] = useState(false);

  const hasTitleTranslation = post.title !== post.originalTitle;
  const hasBodyTranslation = post.text !== post.originalText;

  return (
    <div className="space-y-4">
      {/* Translation info bar */}
      <div className="flex items-center justify-between text-xs text-[#818384] px-1">
        <span>
          Translated with {providerDisplayName} in{" "}
          {(translationTimeMs / 1000).toFixed(1)}s
        </span>
        <span>
          {post.comments.length} top-level comments · {post.numComments} total
        </span>
      </div>

      {/* Post card */}
      <div className="bg-[#1a1a1b] border border-[#343536] rounded-md overflow-hidden">
        {/* Post header */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-1.5 text-xs text-[#818384] mb-2">
            <span className="font-bold text-[#d7dadc] hover:underline cursor-pointer">
              r/{post.subreddit}
            </span>
            <span>·</span>
            <span>
              Posted by u/{post.author}
            </span>
            <span>·</span>
            <span>{timeAgo(post.createdUtc)}</span>
          </div>

          {/* Title */}
          <h1 className="text-lg font-semibold text-[#d7dadc] mb-1">
            {showOriginalTitle ? post.originalTitle : post.title}
          </h1>
          {hasTitleTranslation && (
            <button
              onClick={() => setShowOriginalTitle(!showOriginalTitle)}
              className="text-xs text-[#4fbcff] hover:text-[#7fcdff] mb-2 transition-colors"
            >
              Show {showOriginalTitle ? "translation" : "original title"}
            </button>
          )}

          {/* Body */}
          {post.text && (
            <div className="mt-2">
              <div className="text-sm text-[#d7dadc] whitespace-pre-wrap leading-relaxed">
                {showOriginalBody ? post.originalText : post.text}
              </div>
              {hasBodyTranslation && (
                <button
                  onClick={() => setShowOriginalBody(!showOriginalBody)}
                  className="text-xs text-[#4fbcff] hover:text-[#7fcdff] mt-2 transition-colors"
                >
                  Show {showOriginalBody ? "translation" : "original text"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Post footer */}
        <div className="flex items-center gap-4 px-4 py-2 text-xs text-[#818384]">
          <span className="font-semibold">
            {formatScore(post.score)} upvotes
          </span>
          <span>
            {post.numComments} comments
          </span>
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
