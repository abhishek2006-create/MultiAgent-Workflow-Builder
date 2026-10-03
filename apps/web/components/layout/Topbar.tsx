import Link from "next/link";
export function TopNav() {
  return (
    <nav className="top">
      <Link href="/" className="logo">
        <i />
        FLOWFORGE AI
      </Link>
      <div className="tabs">
        <Link className="tab" href="/">
          Overview
        </Link>
        <Link className="tab" href="/dashboard">
          Dashboard
        </Link>
        <Link className="tab" href="/workflows/demo">
          Workflow builder
        </Link>
      </div>
      <div className="sp" />
      <div className="stat">
        <b />
        SYSTEM ONLINE · AI CORE ACTIVE
      </div>
    </nav>
  );
}
