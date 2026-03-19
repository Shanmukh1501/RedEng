"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  stage?: "fetching" | "translating";
}

export function LoadingSkeleton({ stage = "fetching" }: LoadingSkeletonProps) {
  const message =
    stage === "fetching"
      ? "Fetching post from Reddit..."
      : "Translating...";

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Post skeleton */}
      <div className="bg-[#1a1a1b] border border-[#343536] rounded-md p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20 bg-[#343536]" />
          <Skeleton className="h-3 w-32 bg-[#343536]" />
        </div>
        <Skeleton className="h-6 w-3/4 bg-[#343536]" />
        <Skeleton className="h-4 w-full bg-[#343536]" />
        <Skeleton className="h-4 w-full bg-[#343536]" />
        <Skeleton className="h-4 w-2/3 bg-[#343536]" />
        <div className="flex gap-4 pt-2">
          <Skeleton className="h-3 w-16 bg-[#343536]" />
          <Skeleton className="h-3 w-20 bg-[#343536]" />
        </div>
      </div>

      {/* Comments skeleton */}
      <div className="bg-[#1a1a1b] border border-[#343536] rounded-md p-4 space-y-4">
        <Skeleton className="h-3 w-24 bg-[#343536]" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={i > 2 ? "ml-6" : ""}>
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-3 w-20 bg-[#343536]" />
              <Skeleton className="h-3 w-12 bg-[#343536]" />
            </div>
            <Skeleton className="h-4 w-full bg-[#343536]" />
            <Skeleton className="h-4 w-4/5 bg-[#343536] mt-1" />
          </div>
        ))}
      </div>

      {/* Status message */}
      <div className="text-center text-sm text-[#818384]">
        <div className="flex items-center justify-center gap-2">
          <svg
            className="animate-spin h-4 w-4 text-[#ff4500]"
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
          {message}
        </div>
      </div>
    </div>
  );
}
