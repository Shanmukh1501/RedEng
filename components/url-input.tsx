"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProviderName } from "@/lib/types";

interface ProviderOption {
  name: ProviderName;
  displayName: string;
}

interface URLInputProps {
  onSubmit: (url: string, provider: ProviderName) => void;
  isLoading: boolean;
}

export function URLInput({ onSubmit, isLoading }: URLInputProps) {
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState<ProviderName>("gemini");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.providers || []);
        if (data.providers?.length > 0) {
          setProvider(data.providers[0].name);
        }
      })
      .catch(() => {
        // Fallback — show all providers
        setProviders([
          { name: "gemini", displayName: "Gemini 3 Flash" },
          { name: "openai", displayName: "GPT-4.1 Mini" },
          { name: "anthropic", displayName: "Claude Haiku 4.5" },
        ]);
      });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a Reddit post URL");
      return;
    }

    try {
      const parsed = new URL(trimmed);
      if (
        !/^(old\.|www\.)?reddit\.com$/.test(parsed.hostname) ||
        !/\/r\/\w+\/comments\/\w+/.test(parsed.pathname)
      ) {
        setError("Please enter a valid Reddit post URL (e.g., https://www.reddit.com/r/india/comments/...)");
        return;
      }
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    onSubmit(trimmed, provider);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Paste Reddit post URL here..."
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError("");
          }}
          disabled={isLoading}
          className="flex-1 bg-[#272729] border-[#343536] text-[#d7dadc] placeholder:text-[#6b6e70] focus-visible:ring-[#d7dadc]/30 h-11"
        />
        <Button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="bg-[#ff4500] hover:bg-[#ff5414] text-white font-semibold px-6 h-11 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
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
              Translating...
            </span>
          ) : (
            "Translate"
          )}
        </Button>
      </div>

      {providers.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-[#818384]">
          <span>Model:</span>
          <div className="flex gap-1">
            {providers.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setProvider(p.name)}
                disabled={isLoading}
                className={`px-2.5 py-1 rounded-full transition-colors ${
                  provider === p.name
                    ? "bg-[#ff4500] text-white"
                    : "bg-[#272729] text-[#818384] hover:text-[#d7dadc] hover:bg-[#343536]"
                }`}
              >
                {p.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </form>
  );
}
