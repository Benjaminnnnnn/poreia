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
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-8 py-6 text-center shadow-lg">
        <p className="font-medium text-slate-900">Something went wrong.</p>
        {error.message ? (
          <p className="max-w-xs text-xs text-slate-500">{error.message}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="mt-1 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
