"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="recovery-page" role="alert" aria-labelledby="error-title">
    <p className="eyebrow">SOMETHING INTERRUPTED THIS PAGE</p>
    <h1 id="error-title">Let&apos;s reconnect.</h1>
    <p>The page could not finish loading. Try again, or return to your saved workflows to check the latest state of a run.</p>
    {error.digest && <p className="mono">Reference: {error.digest}</p>}
    <div><button type="button" className="btn pri" onClick={reset}>Try again</button><Link className="btn" href="/workflows">My workflows</Link></div>
  </section>;
}
