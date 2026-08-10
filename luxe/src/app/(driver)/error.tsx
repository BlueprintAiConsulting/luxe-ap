"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
      <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 text-red-500 mb-4">
        <AlertCircle className="w-12 h-12" />
      </div>
      <h2 className="text-xl font-bold mb-2">Something went wrong!</h2>
      <p className="text-neutral-500 mb-6 max-w-sm">
        An unexpected error occurred while loading this page.
      </p>
      <button
        onClick={() => reset()}
        className="bg-black dark:bg-white text-white dark:text-black px-6 py-2 rounded-xl font-medium"
      >
        Try again
      </button>
    </div>
  );
}