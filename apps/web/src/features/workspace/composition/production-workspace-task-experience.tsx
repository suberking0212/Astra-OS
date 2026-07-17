"use client";

import { useMemo } from "react";

import { WorkspaceTaskExperience } from "@/features/workspace/presentation/workspace-task-experience";
import { ApiWorkspaceTaskRepository } from "@/features/workspace/repositories/api-workspace-task-repository";
import { API_BASE_URL } from "@/lib/api-client";
import { getStoredSession } from "@/lib/auth";

export function ProductionWorkspaceTaskExperience() {
  const repository = useMemo(
    () => new ApiWorkspaceTaskRepository(API_BASE_URL, () => getStoredSession()?.accessToken ?? null),
    [],
  );
  return <WorkspaceTaskExperience workspaceId="default" repository={repository} fallbackWorkspaceName="Astra Workspace" />;
}
