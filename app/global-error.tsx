"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
          <div className="text-center">
            <div className="mb-4 text-6xl">🚒</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">
              Une erreur est survenue
            </h1>
            <p className="mb-6 text-gray-600">
              Nous avons été notifiés et travaillons à résoudre le problème.
            </p>
            <button
              onClick={() => reset()}
              className="rounded-md bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
