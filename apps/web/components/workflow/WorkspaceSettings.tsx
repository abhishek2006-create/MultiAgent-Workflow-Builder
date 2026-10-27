"use client";

import { useCallback, useEffect, useState } from "react";
import { http } from "../../lib/api";

type Membership = { role: string; organization: { id: string; name: string; slug: string } };

export default function WorkspaceSettings() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [active, setActive] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [token, setToken] = useState("");
  const [invitation, setInvitation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const [items, profile] = await Promise.all([http.get<Membership[]>("/workspaces"), http.get<{ organizationId: string }>("/auth/me")]);
    setMemberships(items); setActive(profile.organizationId);
  }, []);
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Unable to load workspaces.")); }, [load]);
  const act = async (operation: () => Promise<void>) => {
    setBusy(true); setError(null); setMessage(null);
    try { await operation(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Workspace action failed."); }
    finally { setBusy(false); }
  };
  const canInvite = memberships.some((item) => item.organization.id === active && ["OWNER", "ADMIN"].includes(item.role));
  const input = "mt-2 w-full rounded-lg border border-white/15 bg-black/30 p-3 text-sm text-white";
  return <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.025] p-6">
    <h2 className="text-xl font-medium">Workspaces and members</h2>
    <p className="mt-2 text-sm text-slate-400">Each workspace keeps its workflows and runs separate. Switch workspaces before opening a workflow.</p>
    {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-300">{message}</p>}
    <ul className="mt-5 space-y-2">{memberships.map(({ organization, role: membershipRole }) => <li key={organization.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 p-3">
      <span>{organization.name} <span className="text-xs text-slate-400">· {membershipRole}</span></span>
      {active === organization.id ? <span className="text-xs text-cyan-300">CURRENT WORKSPACE</span> : <button className="btn" type="button" disabled={busy} onClick={() => void act(async () => { await http.post(`/auth/workspaces/${encodeURIComponent(organization.id)}/switch`); window.location.assign("/workflows"); })}>Switch</button>}
    </li>)}</ul>
    <div className="mt-6 grid gap-6 md:grid-cols-2">
      <form onSubmit={(event) => { event.preventDefault(); void act(async () => { await http.post("/workspaces", { name }); setName(""); await load(); setMessage("Workspace created. Select Switch to enter it."); }); }}>
        <label className="text-sm text-slate-300" htmlFor="workspace-name">Create a workspace</label>
        <input className={input} id="workspace-name" maxLength={100} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Workspace name" />
        <button className="btn mt-3" type="submit" disabled={busy}>Create workspace</button>
      </form>
      <form onSubmit={(event) => { event.preventDefault(); void act(async () => { await http.post("/workspaces/invitations/accept", { token }); setToken(""); await load(); setMessage("Invitation accepted. Select Switch to enter the workspace."); }); }}>
        <label className="text-sm text-slate-300" htmlFor="workspace-invite-token">Accept an invitation</label>
        <input className={input} id="workspace-invite-token" minLength={32} maxLength={128} required value={token} onChange={(event) => setToken(event.target.value)} placeholder="Invitation code" autoComplete="off" />
        <button className="btn mt-3" type="submit" disabled={busy}>Join workspace</button>
      </form>
    </div>
    {canInvite && <form className="mt-6 border-t border-white/10 pt-5" onSubmit={(event) => { event.preventDefault(); void act(async () => { const result = await http.post<{ token: string }>(`/workspaces/${encodeURIComponent(active)}/invitations`, { email, role }); setInvitation(result.token); setEmail(""); setMessage("Invitation code created. Share it privately with the invited person; it expires in seven days."); }); }}>
      <h3 className="text-sm font-medium">Invite a member to the current workspace</h3>
      <div className="mt-2 flex flex-wrap gap-3"><input className={input} aria-label="Member email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="member@example.com" /><select className={input} aria-label="Member role" value={role} onChange={(event) => setRole(event.target.value)}><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option><option value="ADMIN">Admin</option></select></div>
      <button className="btn mt-3" type="submit" disabled={busy}>Generate invitation code</button>
      {invitation && <label className="mt-4 block text-xs text-slate-400">Invitation code (shown once)<input className={input} aria-label="Generated invitation code" value={invitation} readOnly onFocus={(event) => event.target.select()} /></label>}
    </form>}
  </section>;
}
