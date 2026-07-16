"use client";

import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight as ChevronRightIcon, Edit3, LoaderCircle, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties } from "react";

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
      <section className="agent-onboarding workspace-launcher-shell" aria-labelledby="workspace-title">
        <header className="agent-top workspace-launcher-top">
          <Link className="agent-brand" href={routes.workspace} aria-label="Astra Workspace">
            <div className="agent-brand-mark" aria-hidden="true" />
            <div className="agent-brand-name">
              <span className="agent-brand-title">Astra</span>
              <span className="agent-brand-subtitle">Workspace</span>
            </div>
          </Link>
          <div className="agent-progress" aria-label="workspace setup progress">
            <span />
            <span />
          </div>
          <button className="agent-account" type="button" onClick={signOut}>
            <LogOut className="icon" aria-hidden="true" />
            <span>{user?.email ?? "Account"}</span>
            <ChevronDown className="icon" aria-hidden="true" />
          </button>
        </header>

        <button className="circle-button workspace-launcher-back" type="button" aria-label="Back">
          <ChevronLeft className="icon" aria-hidden="true" />
        </button>

        <section className="agent-hero workspace-launcher-hero" id="workspace-main">
          <h1 id="workspace-title">Which workspace will run your day?</h1>
          <p>Pick a workspace. AstraOS opens the task runtime with context, approvals, and results in one focused flow.</p>

          <div className="agent-stage" aria-label="Workspace preset carousel">
            <button className="circle-button" type="button" aria-label="Previous workspace">
              <ChevronLeft className="icon" aria-hidden="true" />
            </button>

            <div className="agent-orbs" aria-hidden="true">
              <div className="agent-orb" style={{ "--size": "132px" } as CSSProperties}>
                <div className="agent-avatar-scene" />
              </div>
              <div className="agent-orb active" style={{ "--size": "176px" } as CSSProperties}>
                <div className="agent-avatar-scene" />
              </div>
              <div className="agent-orb" style={{ "--size": "132px" } as CSSProperties}>
                <div className="agent-avatar-scene" />
              </div>
            </div>

            <button className="circle-button" type="button" aria-label="Next workspace">
              <ChevronRightIcon className="icon" aria-hidden="true" />
            </button>
          </div>

          <div className="agent-copy">
            <h2 className="agent-name">
              <span>{projects[0]?.name ?? name}</span>
              <Edit3 className="icon" aria-hidden="true" />
            </h2>
            <div className="agent-role">Enterprise AI Runtime workspace</div>
            <p>
              {projects[0]?.description ?? "Delegate work, approve sensitive actions, provide missing context, and receive business results."}
            </p>
            <div className="dots workspace-launcher-dots" aria-label="Workspace presets">
              {(projects.length ? projects.slice(0, 5) : [null, null, null]).map((project, index) => (
                project ? (
                  <Link
                    aria-label={`Open ${project.name}`}
                    className={`agent-dot ${index === 0 ? "active" : ""}`}
                    href={routes.workspaceProject(project.id)}
                    key={project.id}
                  />
                ) : (
                  <span className={`agent-dot ${index === 0 ? "active" : ""}`} key={index} />
                )
              ))}
            </div>
            {projects[0] ? (
              <Link className="agent-cta" href={routes.workspaceProject(projects[0].id)}>
                Go with {projects[0].name}
                <ArrowRight className="icon" aria-hidden="true" />
              </Link>
            ) : (
              <button className="agent-cta" type="button" disabled={isBusy} onClick={createWorkspace}>
                {status === "creating" ? <LoaderCircle className="icon spin" aria-hidden="true" /> : null}
                Create Astra Workspace
              </button>
            )}
          </div>
        </section>

        <div className="workspace-launcher-grid" id="workspace-main">
          <section className="workspace-create-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Create workspace</h2>
                <p className="panel-caption">Set the owner boundary for task-first runtime work.</p>
              </div>
              <Plus className="icon" aria-hidden="true" />
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
