export default function Loading() {
  return <section className="recovery-page" role="status" aria-live="polite">
    <span className="loading-signal" aria-hidden="true" />
    <p className="eyebrow">OPENING YOUR WORKSPACE</p>
    <h1>Making the connection.</h1>
    <p>Loading the next page…</p>
  </section>;
}
