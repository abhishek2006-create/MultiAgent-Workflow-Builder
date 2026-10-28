"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ProductIcon } from "../ui/ProductIcon";

interface CurrentUser { username: string; }

export function TopNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { credentials: "include", cache: "no-store", signal: controller.signal })
      .then(async (response) => { if (!response.ok) { setUser(null); return; } setUser((await response.json()) as CurrentUser); })
      .catch(() => { if (!controller.signal.aborted) setUser(null); })
      .finally(() => { if (!controller.signal.aborted) setSessionChecked(true); });
    return () => controller.abort();
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true); setLogoutError(null);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error("Logout failed. Please try again.");
      setUser(null); window.location.assign("/signup");
    } catch (error) { setLogoutError(error instanceof Error ? error.message : "Logout failed. Please try again."); setLoggingOut(false); }
  };

  const links = user ? [
    ["Home", "/", "home"],
    ["Overview", "/dashboard", "grid"], ["Workflows", "/workflows", "flow"],
    ["Templates", "/templates", "layers"], ["Approvals", "/approvals", "check"],
    ["Settings", "/settings", "settings"], ["Builder", "/workflows/demo", "terminal"],
  ] : [["Home", "/", "home"], ["The system", "/#system", "flow"], ["Templates", "/templates", "layers"], ["Connections", "/settings", "agent"]];

  return (
    <nav aria-label="Main navigation" className={`top${user ? " authenticated-nav" : ""}${pathname === "/" ? " landing-nav" : ""}`}>
      <Link href="/" className="logo" aria-label="FlowForge AI home"><i />FLOWFORGE<span className="logo-ai">AI</span></Link>
      <div className="tabs">{links.map(([label, href, icon]) => {
        const active = href === "/workflows" ? pathname === href || (pathname.startsWith("/workflows/") && pathname !== "/workflows/demo") : pathname === href;
        return <Link key={href} className={`tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined} href={href}><ProductIcon name={icon} />{label}</Link>;
      })}</div>
      <div className="sp" />
      {sessionChecked && (user ? <div className="nav-account"><span className="nav-avatar" aria-hidden="true">{user.username?.slice(0, 1).toUpperCase() || "F"}</span><span className="nav-username" aria-label="Signed in user">{user.username}</span><button className="tab logout" type="button" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Logging out…" : "Log out ↗"}</button></div> : <div className="nav-account"><Link className="tab" href="/login">Sign in</Link><Link className="nav-start" href="/signup">Get started <ProductIcon name="arrow" /></Link></div>)}
      {logoutError && <span className="logout-error" role="alert">{logoutError}</span>}
    </nav>
  );
}
