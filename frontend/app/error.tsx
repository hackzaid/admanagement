"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admanagement] Frontend route error", error);
  }, [error]);

  return (
    <main className="error-page">
      <section className="error-panel">
        <p className="eyebrow">Application error</p>
        <h1>Something failed while loading this page.</h1>
        <p>
          Check the frontend server logs for the matching error. If the API is temporarily unavailable, retry after the
          backend is healthy.
        </p>
        {error.digest ? <p className="error-digest">Digest: {error.digest}</p> : null}
        <button type="button" onClick={reset}>
          Retry
        </button>
      </section>
    </main>
  );
}
