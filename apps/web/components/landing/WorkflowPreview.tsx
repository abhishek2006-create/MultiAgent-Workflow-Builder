export function WorkflowPreview() {
  return (
    <div className="glass prev">
      <svg viewBox="0 0 900 250" aria-label="Workflow preview">
        <g fill="none">
          <path className="pe" d="M120 125H170" />
          <path className="pe" d="M290 125H340" />
          <path className="pe" d="M460 105L520 60H560" />
          <path className="pe" d="M460 145L520 190H560" />
          <path className="pe" d="M680 60L720 105" />
          <path className="pe" d="M680 190L720 145" />
          <path className="pe" d="M790 125H830" />
        </g>
        <g>
          <rect className="pn" x="20" y="100"  width="100" height="50" rx="10" />
          <text className="pt" x="70" y="130">
            INPUT
          </text>
          <rect
            className="pn"
            x="170"
            y="100"
            width="120"
            height="50"
            rx="10"
            style={{ stroke: "#2f7bff" }}
          />
          <text className="pt" x="230" y="130">
            PLANNER
          </text>
          <rect
            className="pn"
            x="340"
            y="100"
            width="120"
            height="50"
            rx="10"
          />
          <text className="pt" x="400" y="130">
            ROUTER
          </text>
          <rect
            className="pn"
            x="560"
            y="35"
            width="120"
            height="50"
            rx="10"
            style={{ stroke: "#8b5cf6" }}
          />
          <text className="pt" x="620" y="65">
            RESEARCH
          </text>
          <rect
            className="pn"
            x="560"
            y="165"
            width="120"
            height="50"
            rx="10"
            style={{ stroke: "#8b5cf6" }}
          />
          <text className="pt" x="620" y="195">
            CODING
          </text>
          <rect
            className="pn"
            x="700"
            y="100"
            width="90"
            height="50"
            rx="10"
            style={{ stroke: "#f59e0b" }}
          />
          <text className="pt" x="745" y="130">
            REVIEW
          </text>
          <rect
            className="pn"
            x="830"
            y="100"
            width="60"
            height="50"
            rx="10"
            style={{ stroke: "#10b981" }}
          />
          <text className="pt" x="860" y="130">
            OUT
          </text>
        </g>
        <circle r="4" fill="#22d3ee">
          <animateMotion
            dur="4s"
            repeatCount="indefinite"
            path="M70 125H230H400L460 105L520 60H620L680 60L745 125H860"
          />
        </circle>
        <circle r="4" fill="#8b5cf6">
          <animateMotion
            dur="4s"
            begin="1.4s"
            repeatCount="indefinite"
            path="M70 125H230H400L460 145L520 190H620L680 190L745 125H860"
          />
        </circle>
      </svg>
    </div>
  );
}
