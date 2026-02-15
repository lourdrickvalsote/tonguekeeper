"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

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
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground">
        <div className="flex h-screen flex-col items-center justify-center px-6 text-center">
          <div className="flex flex-col items-center gap-5 max-w-md">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>

            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-2">
                Application Error
              </h2>
              <p className="text-sm text-neutral-500 leading-relaxed">
                A critical error occurred. Please try reloading the page.
              </p>
              {error.digest && (
                <p className="mt-2 text-xs text-neutral-400 font-mono">
                  Error ID: {error.digest}
                </p>
              )}
            </div>

            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
