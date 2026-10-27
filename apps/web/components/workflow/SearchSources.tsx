export default function SearchSources({ value }: { value: unknown }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const output = value as Record<string, unknown>;
  if (!Array.isArray(output.searchSources) || output.searchSources.length === 0) return null;
  const sources = output.searchSources.filter((source): source is { url: string; title: string } =>
    Boolean(source && typeof source === "object" && typeof source.url === "string" && /^https?:\/\//i.test(source.url) && typeof source.title === "string"));
  return <details className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-300/5 p-3">
    <summary className="cursor-pointer text-sm text-cyan-200">Web sources ({sources.length})</summary>
    <ul className="mt-3 space-y-2">{sources.map((source) => <li key={source.url}><a className="break-all text-xs text-cyan-300 underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul>
    {typeof output.searchSuggestionsHtml === "string" && <iframe title="Google Search suggestions" className="mt-3 h-40 w-full rounded bg-white" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src https:"><base target="_blank">${output.searchSuggestionsHtml}`} />}
  </details>;
}
