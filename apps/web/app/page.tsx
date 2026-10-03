import { WorkflowPreview } from "../components/landing/WorkflowPreview";
export default function HomePage() {
  return (
    <section className="view on">
      <div className="hero">
        <span className="badge">AI WORKFLOW AUTOMATION</span>
        <h1>
          BUILD
          <br />
          INTELLIGENT
          <br />
          AI WORKFLOWS.
        </h1>
        <p>
          Design autonomous AI systems visually. Connect agents, tools, models
          and knowledge into powerful workflows without manually building
          orchestration logic.
        </p>
        <div className="hero-actions">
          <a className="btn pri" href="/workflows/demo">
            ▶ BUILD WORKFLOW
          </a>
          <a className="btn" href="/dashboard">
            VIEW DEMO
          </a>
        </div>
      </div>
      <WorkflowPreview />
    </section>
  );
}
