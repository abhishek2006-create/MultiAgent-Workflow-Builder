"use client";
import { useMemo, useRef, useState } from "react";
type Status = "idle" | "running" | "success" | "waiting" | "failed";
type N = {
  id: string;
  c: string;
  t: string;
  d: string;
  x: number;
  y: number;
  k: "in" | "ag" | "ap";
};
const initial: N[] = [
  {
    id: "input",
    c: "CORE",
    t: "Input",
    d: "User request",
    x: 500,
    y: 60,
    k: "in",
  },
  {
    id: "planner",
    c: "AI AGENT",
    t: "Planner Agent",
    d: "Gemini",
    x: 500,
    y: 180,
    k: "ag",
  },
  {
    id: "research",
    c: "AI AGENT",
    t: "Research Agent",
    d: "Gemini · 3 tools",
    x: 320,
    y: 330,
    k: "ag",
  },
  {
    id: "coding",
    c: "AI AGENT",
    t: "Coding Agent",
    d: "Gemini · 2 tools",
    x: 680,
    y: 330,
    k: "ag",
  },
  {
    id: "reviewer",
    c: "AI AGENT",
    t: "Reviewer Agent",
    d: "Gemini · memory",
    x: 500,
    y: 480,
    k: "ag",
  },
  {
    id: "approval",
    c: "CONTROL",
    t: "Human Approval",
    d: "Manual gate",
    x: 500,
    y: 610,
    k: "ap",
  },
  {
    id: "output",
    c: "CORE",
    t: "Output",
    d: "Final report",
    x: 500,
    y: 730,
    k: "in",
  },
];
const edges: [string, string][] = [
  ["input", "planner"],
  ["planner", "research"],
  ["planner", "coding"],
  ["research", "reviewer"],
  ["coding", "reviewer"],
  ["reviewer", "approval"],
  ["approval", "output"],
];
const palette = {
  CORE: ["⇥ Input", "⇤ Output", "⑂ Condition", "⇄ Transform"],
  AI: ["✦ LLM", "◈ Agent", "◇ Planner", "◉ Reviewer"],
  TOOLS: [
    "⌁ HTTP Request",
    "◎ Web Search",
    "∑ Calculator",
    "▤ Database",
    "‹› Code Executor",
  ],
  KNOWLEDGE: ["⬡ RAG", "∷ Embedding", "▣ Knowledge Base"],
  CONTROL: ["☑ Human Approval", "◔ Delay", "↻ Loop", "⫴ Parallel"],
};
const labels: Record<Status, string> = {
  idle: "IDLE",
  running: "RUNNING",
  success: "SUCCESS",
  waiting: "WAITING",
  failed: "FAILED",
};
const path = (a: N, b: N) => {
  const y1 = a.y + 44,
    y2 = b.y - 44,
    m = Math.max(40, (y2 - y1) / 2);
  return `M${a.x} ${y1}C${a.x} ${y1 + m},${b.x} ${y2 - m},${b.x} ${y2}`;
};
function Toggle({ label, on = false }: { label: string; on?: boolean }) {
  const [v, setV] = useState(on);
  return (
    <div className="tg">
      {label}
      <button
        className={`sw ${v ? "on" : ""}`}
        onClick={() => setV(!v)}
        role="switch"
        aria-checked={v}
      />
    </div>
  );
}
function Inspector({ n }: { n: N }) {
  return (
    <>
      <h3>
        {n.k === "ag" ? "AGENT" : n.k === "ap" ? "APPROVAL" : "NODE"}{" "}
        CONFIGURATION
      </h3>
      {n.k === "ag" ? (
        <>
          <div className="f">
            <label>Agent name</label>
            <input defaultValue={n.t} />
          </div>
          <div className="f">
            <label>Model</label>
            <select defaultValue="Gemini">
              <option>Gemini</option>
              <option>Claude</option>
              <option>GPT</option>
            </select>
          </div>
          <div className="f">
            <label>Instructions</label>
            <textarea
              defaultValue={`You are a careful ${n.t.toLowerCase()}. Break the task into steps, cite sources, and return structured JSON.`}
            />
          </div>
          <div className="f">
            <label>Tools</label>
            <Toggle label="Web Search" on />
            <Toggle label="HTTP Request" on />
            <Toggle label="Calculator" />
          </div>
          <Toggle label="Memory" on />
          <div className="f">
            <label>
              Max iterations · <span className="mono">10</span>
            </label>
            <input type="range" min="1" max="20" defaultValue="10" />
          </div>
          <div className="f">
            <label>
              Temperature · <span className="mono">0.7</span>
            </label>
            <input type="range" min="0" max="10" defaultValue="7" />
          </div>
          <div className="estimate mono">~1,200 tokens · est. $0.004</div>
        </>
      ) : n.k === "ap" ? (
        <>
          <div className="f">
            <label>Approver</label>
            <input defaultValue="team@flowforge.ai" />
          </div>
          <Toggle label="Require reason on reject" on />
          <Toggle label="Auto-expire after 24h" />
        </>
      ) : (
        <>
          <div className="f">
            <label>Label</label>
            <input defaultValue={n.t} />
          </div>
          <div className="f">
            <label>Schema</label>
            <textarea defaultValue={'{ "task": "string" }'} />
          </div>
          <Toggle label="Streaming" on />
        </>
      )}
    </>
  );
}
function Node({
  n,
  sel,
  status,
  onSelect,
  onMove,
}: {
  n: N;
  sel: boolean;
  status: Status;
  onSelect: () => void;
  onMove: (id: string, x: number, y: number) => void;
}) {
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  return (
    <div
      className={`nd ${sel ? "sel " : ""}${status}`}
      style={{ left: n.x - 105, top: n.y - 44 }}
      onPointerDown={(e) => {
        onSelect();
        const r = e.currentTarget.parentElement!.getBoundingClientRect();
        drag.current = {
          dx: e.clientX - r.left - n.x,
          dy: e.clientY - r.top - n.y,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const r = e.currentTarget.parentElement!.getBoundingClientRect();
        onMove(
          n.id,
          e.clientX - r.left - drag.current.dx,
          e.clientY - r.top - drag.current.dy,
        );
      }}
      onPointerUp={() => (drag.current = null)}
    >
      <i className="pt tp" />
      <i className="pt bt" />
      <div className="c">
        <span>✦ {n.c}</span>
        <span>
          {status === "running"
            ? "◌"
            : status === "success"
              ? "✓"
              : status === "waiting"
                ? "⏸"
                : ""}
        </span>
      </div>
      <div className="t">{n.t}</div>
      <div className="m">
        <span>{n.d}</span>
        <span className="st">{labels[status]}</span>
      </div>
    </div>
  );
}
export function WorkflowBuilder({ workflowId }: { workflowId: string }) {
  const [nodes, setNodes] = useState(initial),
    [selected, setSelected] = useState("research"),
    [states, setStates] = useState<Record<string, Status>>({}),
    [es, setEs] = useState<Record<number, string>>({}),
    [running, setRunning] = useState(false),
    [approval, setApproval] = useState(false),
    [logs, setLogs] = useState([
      "[ready] workflow engine ready — press RUN WORKFLOW",
    ]),
    [status, setStatus] = useState<Status>("idle"),
    [progress, setProgress] = useState(0),
    [tokens, setTokens] = useState(0),
    [min, setMin] = useState(false);
  const resolve = useRef<((v: boolean) => void) | undefined>(undefined);
  const map = useMemo(
    () => Object.fromEntries(nodes.map((n) => [n.id, n])),
    [nodes],
  );
  const move = (id: string, x: number, y: number) =>
    setNodes((v) =>
      v.map((n) =>
        n.id === id
          ? {
              ...n,
              x: Math.max(105, Math.min(895, x)),
              y: Math.max(44, Math.min(756, y)),
            }
          : n,
      ),
    );
  const log = (m: string) =>
    setLogs((v) => [...v, `[${new Date().toTimeString().slice(0, 8)}] ${m}`]);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const edge = async (i: number) => {
    setEs((v) => ({ ...v, [i]: "act" }));
    await wait(900);
    setEs((v) => ({ ...v, [i]: "done" }));
  };
  const step = async (id: string, ms: number, a: string, b: string) => {
    setStates((v) => ({ ...v, [id]: "running" }));
    log(a);
    await wait(ms);
    setStates((v) => ({ ...v, [id]: "success" }));
    log(b);
    setTokens((v) => v + Math.floor(400 + Math.random() * 500));
  };
  const run = async () => {
    if (running) return;
    setRunning(true);
    setStates({});
    setEs({});
    setProgress(0);
    setTokens(0);
    setLogs([]);
    setStatus("running");
    try {
      log("workflow started");
      await step("input", 500, "input received", "input validated");
      setProgress(14);
      await edge(0);
      await step(
        "planner",
        1100,
        "planner initialized",
        "plan created: 2 parallel tasks",
      );
      setProgress(30);
      await Promise.all([edge(1), edge(2)]);
      await Promise.all([
        step("research", 1900, "research agent running", "research completed"),
        step("coding", 2300, "coding agent running", "coding completed"),
      ]);
      setProgress(60);
      await Promise.all([edge(3), edge(4)]);
      await step("reviewer", 1200, "reviewer agent running", "review passed");
      setProgress(78);
      await edge(5);
      setStates((v) => ({ ...v, approval: "waiting" }));
      setStatus("waiting");
      setApproval(true);
      const ok = await new Promise<boolean>((r) => (resolve.current = r));
      setApproval(false);
      if (!ok) throw Error("rejected");
      setStatus("running");
      setStates((v) => ({ ...v, approval: "success" }));
      log("approved by team@flowforge.ai");
      setProgress(90);
      await edge(6);
      await step("output", 600, "generating output", "output delivered");
      setProgress(100);
      setStatus("success");
      log("workflow completed");
    } catch {
      setStatus("failed");
      log("workflow stopped");
    } finally {
      setRunning(false);
    }
  };
  const approve = (v: boolean) => resolve.current?.(v);
  return (
    <section className="view on builder-view">
      <div className="tb">
        <a className="btn" href="/dashboard">
          ← Back
        </a>
        <div className="wf">
          RESEARCH &amp; BUILD PIPELINE{" "}
          <span>{workflowId === "demo" ? "wf_8f21a4" : workflowId}</span>
        </div>
        <div className="sp" />
        <button className="btn">Save</button>
        <button className="btn">Undo</button>
        <button className="btn">Validate</button>
        <button className="btn pri" onClick={run} disabled={running}>
          ▶ RUN WORKFLOW
        </button>
        <button className="btn" onClick={() => approve(false)}>
          ■ Stop
        </button>
      </div>
      <div className="bar">
        <i style={{ width: `${progress}%` }} />
      </div>
      <div className="bw">
        <aside className="pal">
          <h3 className="disp palette-title">NODE LIBRARY</h3>
          {Object.entries(palette).map(([g, items]) => (
            <div key={g}>
              <h4>{g}</h4>
              {items.map((x) => (
                <div className="pi" key={x}>
                  <i>{x[0]}</i>
                  {x.slice(2)}
                </div>
              ))}
            </div>
          ))}
        </aside>
        <div className="cv">
          <div className="hud">
            <div className="ro mono">
              NODES {nodes.length} · EDGES {edges.length} · WORKFLOW{" "}
              {workflowId}
            </div>
            <div className="mm glass">
              <svg viewBox="0 0 1000 800">
                {nodes.map((n) => (
                  <rect
                    key={n.id}
                    x={n.x - 105}
                    y={n.y - 44}
                    width="210"
                    height="88"
                    rx="16"
                    fill="rgba(47,123,255,.45)"
                    stroke="rgba(160,190,255,.5)"
                    strokeWidth="4"
                  />
                ))}
              </svg>
            </div>
          </div>
          <div id="world">
            <svg id="es">
              {edges.map(([a, b], i) => (
                <path
                  key={i}
                  className={`edge ${es[i] || ""}`}
                  d={path(map[a], map[b])}
                />
              ))}
            </svg>
            {nodes.map((n) => (
              <Node
                key={n.id}
                n={n}
                sel={selected === n.id}
                status={states[n.id] || "idle"}
                onSelect={() => setSelected(n.id)}
                onMove={move}
              />
            ))}
            {status === "success" && (
              <div className="glass done">
                <div className="disp">✓ WORKFLOW COMPLETED</div>
                <div className="mono done-sub">
                  7 nodes · 2 parallel branches
                </div>
              </div>
            )}
          </div>
        </div>
        <aside className="cfg">
          <Inspector n={map[selected]} />
        </aside>
      </div>
      <div className={`con glass ${min ? "min" : ""}`}>
        <button className="ch" onClick={() => setMin(!min)}>
          <span className="ti">EXECUTION CONSOLE</span>
          <span>
            STATUS <b>{labels[status]}</b>
          </span>
          <span>
            TOKENS <b>{tokens.toLocaleString()}</b>
          </span>
          <span>
            COST <b>${(tokens * 0.0000064).toFixed(3)}</b>
          </span>
          <span className="sp" />
          <span>WORKFLOW ENGINE {running ? "RUNNING" : "READY"}</span>
        </button>
        {!min && (
          <div id="log">
            {logs.map((x, i) => (
              <div key={i}>{x}</div>
            ))}
          </div>
        )}
      </div>
      {approval && (
        <div className="ov">
          <div className="glass md">
            <h3>▲ HUMAN APPROVAL REQUIRED</h3>
            <div>Reviewer Agent wants to publish the generated report.</div>
            <div className="kv">
              WORKFLOW <b>Research &amp; Build</b>
              <br />
              ACTION <b>publish_report(v1.2)</b>
              <br />
              RISK <b className="warn">MEDIUM</b>
            </div>
            <button className="btn pri" onClick={() => approve(true)}>
              APPROVE
            </button>{" "}
            <button className="btn" onClick={() => approve(false)}>
              REJECT
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
