"use client";

import { ArrowLeft, ClipboardCheck, LoaderCircle, LogOut, SendHorizonal, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  ApiError,
  getMe,
  getProject,
  workspaceActionMappings,
  type AuthUser,
  type Project,
} from "@/lib/api-client";
import { clearStoredSession, getStoredSession, saveSession } from "@/lib/auth";
import { routes } from "@/lib/routes";

export function WorkspaceDetail() {
  const router = useRouter();
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [taskPrompt, setTaskPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mappings = useMemo(() => workspaceActionMappings(workspaceId), [workspaceId]);

  const handleUnauthorized = useCallback((err: unknown) => {
    if (err instanceof ApiError && err.status === 401) {
      clearStoredSession();
      router.push(routes.login);
      return true;
    }
    return false;
  }, [router]);

  useEffect(() => {
    const session = getStoredSession();
    if (!session) {
      router.push(routes.login);
      return;
    }
    const activeToken = session.accessToken;

    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const [currentUser, currentProject] = await Promise.all([
          getMe(activeToken),
          getProject(activeToken, workspaceId),
        ]);
        setUser(currentUser);
        setProject(currentProject);
        saveSession({ accessToken: activeToken, user: currentUser });
      } catch (err) {
        if (!handleUnauthorized(err)) {
          setError(err instanceof Error ? err.message : "Unable to load workspace.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [handleUnauthorized, router, workspaceId]);

  function signOut() {
    clearStoredSession();
    router.push(routes.login);
  }

  return (
    <main className="agent-experience">
      <section className="agent-shell" aria-labelledby="workspace-title">
        <header className="agent-top">
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

        <div className="agent-layout">
          <aside className="agent-sidebar">
            <Link className="agent-new-task" href={routes.workspace}>
              <ArrowLeft className="icon" aria-hidden="true" />
              Workspaces
            </Link>
            <div className="agent-task-list">
              {mappings.map((mapping) => (
                <div className="agent-task-item" key={mapping.key}>
                  <span className="agent-task-title">{mapping.label}</span>
                  <span className="agent-task-meta">{mapping.method} {mapping.path}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className="agent-main">
            {isLoading ? (
              <div className="empty-state">
                <LoaderCircle className="icon spin" aria-hidden="true" />
                <span>Loading workspace.</span>
              </div>
            ) : error ? (
              <div className="form-alert error">{error}</div>
            ) : (
              <>
                <div className="agent-thread-header">
                  <div>
                    <div className="agent-status-pill">
                      <ShieldCheck className="icon" aria-hidden="true" />
                      <span>Runtime rebuild pending</span>
                    </div>
                    <h1 id="workspace-title">{project?.name ?? "Workspace"}</h1>
                    <p>{project?.description ?? "Task-first workspace shell."}</p>
                  </div>
                </div>

                <div className="agent-thread-body">
                  <section className="agent-card">
                    <div className="panel-header">
                      <div>
                        <h2 className="panel-title">Contract-first runtime placeholder</h2>
                        <p className="panel-caption">
                          The old hardcoded Agent/Workflow runtime has been removed. These controls mark the API surface that the new TaskRequest and RuntimeInvocation system should fill.
                        </p>
                      </div>
                      <ClipboardCheck className="icon" aria-hidden="true" />
                    </div>
                    <div className="panel-body field-stack">
                      {mappings.map((mapping) => (
                        <div className="field" key={mapping.key}>
                          <div className="field-label">{mapping.label}</div>
                          <div className="field-value">{mapping.method} {mapping.path}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="agent-composer">
                  <textarea
                    aria-label="Task prompt"
                    onChange={(event) => setTaskPrompt(event.target.value)}
                    placeholder="Describe the task. Submission will be wired to the new TaskRequest API."
                    rows={3}
                    value={taskPrompt}
                  />
                  <button className="btn primary" type="button" disabled>
                    <SendHorizonal className="icon" aria-hidden="true" />
                    Submit task
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
