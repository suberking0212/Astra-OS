"use client";

import { useMemo } from "react";

import { WorkspaceTaskExperience } from "@/features/workspace/presentation/workspace-task-experience";
import { MockWorkspaceTaskRepository } from "@/mock/repositories/mock-workspace-task-repository";

export function Phase2MockWorkspace() {
  const repository = useMemo(() => new MockWorkspaceTaskRepository("demo"), []);
  return <WorkspaceTaskExperience workspaceId="demo" repository={repository} fallbackWorkspaceName="Astra Mock Workspace" />;
}
