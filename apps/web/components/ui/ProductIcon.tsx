import type { CSSProperties } from "react";

const paths: Record<string, string> = {
  home: "m3 10 9-7 9 7 M5 9v12h5v-7h4v7h5V9",
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  flow: "M4 4h6v6H4z M14 14h6v6h-6z M10 7h7v7 M7 10v7h7",
  layers: "m12 3 10 5-10 5L2 8z M2 12l10 5 10-5 M2 16l10 5 10-5",
  check: "m5 12 4 4L19 6 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10",
  settings: "M4 7h16 M4 17h16 M8 4v6 M16 14v6",
  agent: "m12 2 2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z",
  search: "M16.5 16.5 22 22 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  code: "m8 5-6 7 6 7 M16 5l6 7-6 7 m-3-17-2 20",
  arrow: "M4 12h16 m-7-7 7 7-7 7",
  terminal: "m4 6 6 6-6 6 M13 18h7",
  globe: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20 M2 12h20 M12 2c6 5 6 15 0 20-6-5-6-15 0-20",
  input: "M4 4h16v16H4z M8 12h8 m-3-3 3 3-3 3",
};

export function ProductIcon({ name = "flow", className = "", style }: { name?: string; className?: string; style?: CSSProperties }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}><path d={paths[name] ?? paths.flow} /></svg>;
}

export function IntegrationMap({ compact = false }: { compact?: boolean }) {
  return <div className={`integration-map${compact ? " compact" : ""}`} aria-hidden="true">
    <div className="integration-grid" />
    <svg className="integration-wires" viewBox="0 0 700 300" fill="none"><path d="M350 150H200V65H100 M350 150h150V65h100 M350 150H190v85h-90 M350 150h160v85h90" /><path d="M350 150V35 M350 150v115" /></svg>
    <div className="integration-core"><ProductIcon name="flow" /></div>
    {["agent", "search", "code", "check", "globe", "terminal"].map((name, i) => <span className={`integration-satellite satellite-${i}`} key={name}><ProductIcon name={name} /></span>)}
    <span className="integration-caption">ONE CANVAS. EVERY CONNECTION.</span>
  </div>;
}
