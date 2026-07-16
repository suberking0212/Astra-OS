"use client";

import {
  Brain,
  LoaderCircle,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { WorkspaceOverview } from "@/features/workspace/components/workspace-overview";
import type {
  HistoryTaskView,
  TaskComposerView,
  WorkspaceUnavailableView,
} from "@/features/workspace/contract/view-model";
import { ApiError, getMe, type AuthUser } from "@/lib/api-client";
import { clearStoredSession, getStoredSession, saveSession } from "@/lib/auth";
import { routes } from "@/lib/routes";

export function WorkspaceDetail() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const unavailableView: WorkspaceUnavailableView = {
    title: "Task experience is not connected yet",
    description:
      "This production workspace already uses the Task-first shell, but task submission, interactions, progress, and results are still waiting for the formal presentation contract phases.",
    note:
      "Phase 1 keeps the production route honest: the structure is visible, while the real Task capability stays explicitly unavailable until later phases connect it.",
  };

  const composerView: TaskComposerView = {
    currentRequirement: "Keep the production workspace explicit about Task capability being unavailable.",
    placeholder: "Task submission will be enabled after the Workspace contract is implemented.",
    prefill: "",
    suggestedPrompts: [],
    supportsAttachments: false,
    disabled: true,
    disabledReason:
      "Task submission remains disabled in production until the formal Workspace presentation contract is connected in later phases.",
    submitLabel: "Submit task unavailable",
    addContextLabel: "Add context unavailable",
  };

  const history: HistoryTaskView[] = [];

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
        const currentUser = await getMe(activeToken);
        setUser(currentUser);
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
  }, [handleUnauthorized, router]);

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
              <span className="agent-task-item-text">Astra Workspace</span>
            </div>
          </div>

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
          {isLoading ? (
            <div className="empty-state">
              <LoaderCircle className="icon spin" aria-hidden="true" />
              <span>Loading workspace.</span>
            </div>
          ) : error ? (
            <div className="form-alert error">{error}</div>
          ) : (
            <WorkspaceOverview
              workspaceName="Astra Workspace"
              statusLabel="Workspace shell"
              task={null}
              history={history}
              composer={composerView}
              unavailable={unavailableView}
            />
          )}
        </section>
      </section>
    </main>
  );
}
