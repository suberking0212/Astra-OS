"use client";

import { ArrowRight, CheckCircle2, ClipboardList, LoaderCircle, LogOut, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ApiError, createProject, getMe, listProjects, type AuthUser, type Project } from "@/lib/api-client";
import { clearStoredSession, getStoredSession, saveSession } from "@/lib/auth";
import { routes } from "@/lib/routes";

type LauncherStatus = "checking_session" | "loading_projects" | "ready" | "creating";

export function WorkspaceLauncher() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<LauncherStatus>("checking_session");
  const [name, setName] = useState("Astra Workspace");
  const [description, setDescription] = useState("Task-first workspace for the rebuilt AstraOS runtime.");
  const [error, setError] = useState<string | null>(null);

  const handleUnauthorized = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      clearStoredSession();
      router.push(routes.login);
      return true;
    }
    return false;
  }, [router]);

  const loadProjects = useCallback(async (activeToken: string) => {
    setStatus("loading_projects");
    setError(null);
    try {
      const [currentUser, nextProjects] = await Promise.all([
        getMe(activeToken),
        listProjects(activeToken),
      ]);
      setUser(currentUser);
      setProjects(nextProjects);
      saveSession({ accessToken: activeToken, user: currentUser });
      setStatus("ready");
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setStatus("ready");
        setError(err instanceof Error ? err.message : "Unable to load workspaces.");
      }
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.push(routes.login);
      return;
    }
    setToken(session.accessToken);
    setUser(session.user);
    void loadProjects(session.accessToken);
  }, [loadProjects, router]);

  function signOut() {
    clearStoredSession();
    router.push(routes.login);
  }

  async function createWorkspace() {
    if (!token || status === "creating") return;
    const workspaceName = name.trim();
    if (!workspaceName) {
      setError("Workspace name is required.");
      return;
    }

    setStatus("creating");
    setError(null);
    try {
      const project = await createProject(token, {
        name: workspaceName,
        description: description.trim() || null,
      });
      router.push(routes.workspaceProject(project.id));
    } catch (err) {
      if (!handleUnauthorized(err)) {
        setError(err instanceof Error ? err.message : "Unable to create workspace.");
        setStatus("ready");
      }
    }
  }

  const isBusy = status === "checking_session" || status === "loading_projects" || status === "creating";

  return (
    <main className="agent-experience workspace-launcher-experience">
      <section className="workspace-launcher-shell" aria-labelledby="workspace-title">
        <header className="agent-top workspace-launcher-top">
          <Link className="agent-brand" href={routes.workspace} aria-label="Astra Workspace">
            <div className="agent-brand-mark" aria-hidden="true" />
            <div className="agent-brand-name">
              <span className="agent-brand-title">Astra</span>
              <span className="agent-brand-subtitle">Workspace</span>
            </div>
          </Link>
          <button className="agent-account" type="button" onClick={signOut}>
            <LogOut className="icon" aria-hidden="true" />
            <span>{user?.email ?? "Account"}</span>
          </button>
        </header>

        <div className="workspace-launcher-grid" id="workspace-main">
          <section className="workspace-launcher-hero">
            <div className="agent-status-pill">
              <ShieldCheck className="icon" aria-hidden="true" />
              <span>Rebuild baseline</span>
            </div>
            <h1 id="workspace-title">Task-first workspace</h1>
            <p>
              The old agent, workflow, runtime, test chat, and marketplace surfaces have been removed.
              This shell now preserves account access, workspace ownership, and the visual foundation for
              the new contract-first runtime.
            </p>
            <div className="workspace-launcher-checks">
              <span><CheckCircle2 className="icon" aria-hidden="true" /> JWT auth retained</span>
              <span><CheckCircle2 className="icon" aria-hidden="true" /> Email verification retained</span>
              <span><CheckCircle2 className="icon" aria-hidden="true" /> Workspace shell retained</span>
            </div>
          </section>

          <section className="workspace-create-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Create workspace</h2>
                <p className="panel-caption">Only the ownership boundary is created at this stage.</p>
              </div>
              <ClipboardList className="icon" aria-hidden="true" />
            </div>
            <div className="panel-body field-stack">
              {error ? <div className="form-alert error">{error}</div> : null}
              <label>
                <span>Workspace name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>
                <span>Description</span>
                <textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
              </label>
              <button className="btn primary" type="button" disabled={isBusy} onClick={createWorkspace}>
                {status === "creating" ? <LoaderCircle className="icon spin" aria-hidden="true" /> : <Plus className="icon" aria-hidden="true" />}
                Create workspace
              </button>
            </div>
          </section>

          <section className="workspace-list-panel">
            <div className="panel-header">
              <h2 className="panel-title">Your workspaces</h2>
            </div>
            <div className="panel-body field-stack">
              {isBusy && status !== "creating" ? (
                <div className="empty-state compact">
                  <LoaderCircle className="icon spin" aria-hidden="true" />
                  <span>Loading workspaces.</span>
                </div>
              ) : projects.length ? (
                projects.map((project) => (
                  <Link className="workspace-project-row" href={routes.workspaceProject(project.id)} key={project.id}>
                    <span>
                      <strong>{project.name}</strong>
                      <small>{project.description ?? "No description"}</small>
                    </span>
                    <ArrowRight className="icon" aria-hidden="true" />
                  </Link>
                ))
              ) : (
                <div className="empty-state compact">
                  <span>No workspaces yet.</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
