"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {error.message
          ? error.message
          : "An unexpected error occurred. Please try again."}
        {error.digest && (
          <span className="mt-1 block font-mono text-xs opacity-60">
            Ref: {error.digest}
          </span>
        )}
      </p>
      <button
        onClick={reset}
        className="text-primary mt-4 text-sm underline underline-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
