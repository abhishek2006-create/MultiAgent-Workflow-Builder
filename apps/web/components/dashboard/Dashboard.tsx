"use client";

import { useEffect, useState } from "react";
const metrics = [
  ["ACTIVE WORKFLOWS", 128, "+12 this week", "#2f7bff"],
  ["EXECUTIONS", 2481, "+8.4%", "#8b5cf6"],
  ["SUCCESS RATE", 97.8, "+0.6%", "#10b981"],
  ["AI COST", 42.18, "-3.1% vs last week", "#22d3ee"],
] as const;
const rows = [
  ["ex_9a31c", "Research & Build", "SUCCESS", "12.4s", "8,214", "$0.061"],
  ["ex_9a31b", "Support Triage", "RUNNING", "04.2s", "2,841", "$0.018"],
  ["ex_9a31a", "Doc Summarizer", "SUCCESS", "07.9s", "5,102", "$0.033"],
  ["ex_9a319", "Lead Enrichment", "FAILED", "02.1s", "1,190", "$0.007"],
  ["ex_9a318", "Research & Build", "SUCCESS", "11.8s", "7,960", "$0.058"],
];
const feed = [
  "Planner Agent finished",
  "Web Search returned 8 results",
  "Approval requested",
  "Embedding batch indexed",
  "Reviewer Agent passed",
  "HTTP Request 200 OK",
];
export function Dashboard() {
  const [events, setEvents] = useState(feed);
  useEffect(() => {
    const t = setInterval(
      () =>
        setEvents((v) =>
          [feed[(v.length + 1) % feed.length], ...v].slice(0, 6),
        ),
      2600,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <section className="view on">
      <div className="dash">
        <h2>SYSTEM OVERVIEW</h2>
        <div className="grid4">
          {metrics.map((m, i) => (
            <div className="glass mc" key={m[0]}>
              <small>{m[0]}</small>
              <div className="n">
                {i === 2
                  ? `${m[1]}%`
                  : i === 3
                    ? `$${m[1]}`
                    : Number(m[1]).toLocaleString()}
              </div>
              <div className="tr">▲ {m[2]}</div>
              <svg className="metric-spark" viewBox="0 0 154 40">
                <polyline
                  points="0,30 14,25 28,31 42,18 56,21 70,10 84,15 98,7 112,13 126,2 140,8 154,0"
                  fill="none"
                  stroke={m[3]}
                  strokeWidth="2"
                />
              </svg>
            </div>
          ))}
        </div>
        <div className="dg">
          <div className="glass cp">
            <div className="ph">
              <span>EXECUTION VOLUME</span>
              <span className="mono">LAST 24H</span>
            </div>
            <svg id="ch" viewBox="0 0 600 160" preserveAspectRatio="none">
              <path
                className="ln"
                d="M0 120L50 105L100 112L150 95L200 102L250 80L300 88L350 70L400 76L450 52L500 60L550 38L600 46"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2"
              />
              <path
                className="ln"
                d="M0 130L50 120L100 125L150 108L200 112L250 100L300 104L350 92L400 96L450 82L500 88L550 74L600 78"
                fill="none"
                stroke="#2f7bff"
                strokeWidth="2"
              />
            </svg>
          </div>
          <div className="glass cp">
            <div className="ph">
              <span>MODEL USAGE</span>
              <span className="mono">TOKENS</span>
            </div>
            {[
              ["Gemini", 58, "#2f7bff"],
              ["Claude", 27, "#8b5cf6"],
              ["GPT", 15, "#22d3ee"],
            ].map((x) => (
              <div className="mu" key={x[0]}>
                <div>
                  <span>{x[0]}</span>
                  <span className="mono">{x[1]}%</span>
                </div>
                <div className="tk">
                  <i style={{ width: `${x[1]}%`, background: x[2] }} />
                </div>
              </div>
            ))}
            <div className="mono usage-foot">
              p95 LATENCY <b>1.84s</b> · TOOL CALLS <b>9,402</b>
            </div>
          </div>
          <div className="glass cp">
            <div className="ph">
              <span>LIVE FEED</span>
              <span className="live">● LIVE</span>
            </div>
            <div className="feed mono">
              {events.map((e, i) => (
                <div key={`${e}-${i}`}>
                  <b>event_{String(i + 1).padStart(2, "0")}</b>
                  {e}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="glass tw">
          <table className="tbl">
            <thead>
              <tr>
                {[
                  "EXECUTION ID",
                  "WORKFLOW",
                  "STATUS",
                  "DURATION",
                  "TOKENS",
                  "COST",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]}>
                  {r.map((x, i) => (
                    <td key={i} className={i >= 3 ? "mono" : ""}>
                      {i === 2 ? (
                        <span
                          className={`sb ${x === "SUCCESS" ? "s" : x === "RUNNING" ? "r" : "f"}`}
                        >
                          {x}
                        </span>
                      ) : (
                        x
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
