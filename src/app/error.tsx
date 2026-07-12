"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground mt-2 max-w-sm text-sm">
        An unexpected error occurred. If this keeps happening, please contact
        support.
        {error.digest && (
          <span className="mt-1 block font-mono text-xs opacity-60">
            Reference: {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
