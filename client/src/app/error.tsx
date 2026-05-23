"use client";

import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-400/20 bg-red-900/10 px-8 py-6 text-center shadow-xl backdrop-blur-xl">
        <p className="font-medium text-white">Something went wrong.</p>
        {error.message ? (
          <p className="max-w-xs text-xs text-white/50">{error.message}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
