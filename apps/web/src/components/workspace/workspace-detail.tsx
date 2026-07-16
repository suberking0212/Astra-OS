"use client";

import {
  ArrowUp,
  Brain,
  Clock3,
  LoaderCircle,
  LogOut,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  getMe,
  getProject,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <main className="agent-experience agent-workspace-view">
      <section className="agent-workspace" aria-labelledby="workspace-title">
        <aside className="agent-sidebar" aria-label="Workspace navigation">
          <div className="agent-sidebar-head">
            <Link className="agent-brand" href={routes.workspace} aria-label="Astra Workspace">
              <div className="agent-brand-mark" aria-hidden="true" />
              <div className="agent-brand-name">
                <span className="agent-brand-title">Astra</span>
                <span className="agent-brand-subtitle">Workspace</span>
              </div>
            </Link>
          </div>

          <div className="agent-nav-area">
            <p className="agent-section-label">Current workspace</p>
            <div className="agent-task-item">
              <Brain className="icon" aria-hidden="true" />
              <span className="agent-task-item-text">{project?.name ?? "Workspace"}</span>
            </div>
          </div>

          <Link className="agent-new-task" href={routes.workspace}>
            Workspaces
            <Plus className="icon" aria-hidden="true" />
          </Link>

          <div className="agent-profile">
            <div className="agent-profile-main">
              <span className="agent-profile-avatar">{user?.email?.[0]?.toUpperCase() ?? "A"}</span>
              <span className="agent-profile-name">{user?.email ?? "Account"}</span>
            </div>
            <button type="button" onClick={signOut} aria-label="Sign out">
              <LogOut className="icon" aria-hidden="true" />
            </button>
          </div>
        </aside>

        <section className="agent-work-main">
          <header className="agent-work-top">
            <div className="agent-task-title" id="workspace-title">
              <Brain className="icon" aria-hidden="true" />
              {project?.name ?? "Astra Workspace"}
            </div>
            <div className="agent-top-actions">
              <div className="agent-credit-pill" aria-label="Workspace status">
                <Clock3 className="icon" aria-hidden="true" />
                Workspace ready
              </div>
            </div>
          </header>

          {isLoading ? (
            <div className="empty-state">
              <LoaderCircle className="icon spin" aria-hidden="true" />
              <span>Loading workspace.</span>
            </div>
          ) : error ? (
            <div className="form-alert error">{error}</div>
          ) : (
            <>
              <section className="agent-conversation" aria-label="Workspace baseline">
                <div className="agent-run-feed workspace-task-surface">
                  <div className="agent-thinking-card">
                    <div className="agent-thinking-head">
                      <div className="agent-thinking-title">
                        <Sparkles className="icon" aria-hidden="true" />
                        <span>Task experience is not connected yet</span>
                      </div>
                    </div>
                    <div className="agent-thinking-body">
                      <p>
                        This production workspace currently reads only authenticated account and workspace data.
                        Task submission, interactions, progress, and results will be connected through the formal
                        Workspace presentation contract in the next delivery phases.
                      </p>
                      {project?.description ? <p>{project.description}</p> : null}
                    </div>
                  </div>
                </div>
              </section>

              <section className="agent-bottom-stack" aria-label="Task composer unavailable">
                <div className="agent-composer-layer">
                  <form className="agent-composer">
                    <label>
                      <span className="sr-only">Task composer unavailable</span>
                      <textarea
                        aria-label="Task composer unavailable"
                        disabled
                        placeholder="Task submission will be enabled after the Workspace contract is implemented."
                        rows={3}
                      />
                    </label>
                    <div className="agent-composer-footer">
                      <button className="agent-composer-plus" type="button" disabled aria-label="Add context unavailable">
                        <Plus className="icon" aria-hidden="true" />
                      </button>
                      <span className="agent-composer-spacer" />
                      <button className="agent-send" type="button" disabled aria-label="Submit task unavailable">
                        <ArrowUp className="icon" aria-hidden="true" />
                      </button>
                    </div>
                  </form>
                </div>
              </section>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
