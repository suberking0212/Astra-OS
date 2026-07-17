import { beforeEach, describe, expect, it } from "vitest";

import { ApiWorkspaceTaskRepository } from "@/features/workspace/repositories/api-workspace-task-repository";
import type { WorkspaceTaskRepository } from "@/features/workspace/repositories/workspace-task-repository";
import { MockWorkspaceTaskRepository } from "@/mock/repositories/mock-workspace-task-repository";

function mockFetchAdapter(repository: WorkspaceTaskRepository): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const parts = url.pathname.split("/").filter(Boolean);
    try {
      let payload: unknown;
      if (parts[0] === "api" && parts[1] === "workspaces" && parts[3] === "task-view") {
        payload = await repository.loadWorkspaceTaskView(parts[2]);
      } else if (parts[0] === "api" && parts[1] === "workspaces" && parts[3] === "tasks") {
        payload = await repository.submitTask({ workspaceId: parts[2], intent: body.intent, references: body.references });
      } else if (parts[0] === "api" && parts[1] === "tasks" && parts[3] === "interactions") {
        payload = await repository.submitInteractionResponse({ taskId: parts[2], interactionId: parts[4], action: body.action, data: body.data });
      } else if (parts[0] === "api" && parts[1] === "tasks" && parts[3] === "commands" && parts[4] === "retry") {
        payload = await repository.retryTask({ taskId: parts[2] });
      } else if (parts[0] === "api" && parts[1] === "tasks" && parts[3] === "commands" && parts[4] === "cancel") {
        payload = await repository.cancelTask({ taskId: parts[2] });
      } else if (parts[0] === "api" && parts[1] === "tasks" && parts[3] === "result") {
        payload = await repository.loadTaskResult(parts[2]);
      } else if (parts[0] === "api" && parts[1] === "tasks") {
        payload = await repository.loadTask(parts[2]);
      } else {
        return new Response(JSON.stringify({ code: "not_found", message: "Not found", retryable: false, details: null }), { status: 404 });
      }
      return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (error) {
      const value = error as { status?: number; code?: string; message?: string; retryable?: boolean };
      return new Response(JSON.stringify({ code: value.code ?? "error", message: value.message ?? "Error", retryable: value.retryable ?? false, details: null }), { status: value.status ?? 409 });
    }
  };
}

function repositoryContract(name: string, factory: () => WorkspaceTaskRepository) {
  describe(`${name} WorkspaceTaskRepository contract`, () => {
    let repository: WorkspaceTaskRepository;
    beforeEach(() => { repository = factory(); });

    it("completes context and approval into a result", async () => {
      expect((await repository.loadWorkspaceTaskView("demo")).contractVersion).toBe("workspace-presentation-v1");
      let task = await repository.submitTask({ workspaceId: "demo", intent: "Draft a missing-delivery reply", references: [] });
      expect(task.status).toBe("needs_context");
      task = await repository.submitInteractionResponse({ taskId: task.id, interactionId: task.interactions[0].id, action: "submit", data: { customer_email: "alex@example.com", order_number: "ACME-10492" } });
      expect(task.status).toBe("needs_approval");
      task = await repository.submitInteractionResponse({ taskId: task.id, interactionId: task.interactions[0].id, action: "approve", data: {} });
      expect(task.status).toBe("completed");
      expect((await repository.loadTaskResult(task.id))?.status).toBe("succeeded");
    });

    it("supports reject and cancel without a success result", async () => {
      let task = await repository.submitTask({ workspaceId: "demo", intent: "Draft reply", references: [] });
      task = await repository.submitInteractionResponse({ taskId: task.id, interactionId: task.interactions[0].id, action: "submit", data: { customer_email: "a@example.com", order_number: "A-1" } });
      task = await repository.submitInteractionResponse({ taskId: task.id, interactionId: task.interactions[0].id, action: "reject", data: {} });
      expect(task.result?.status).toBe("cancelled");
      task = await repository.submitTask({ workspaceId: "demo", intent: "Another task", references: [] });
      expect((await repository.cancelTask({ taskId: task.id })).status).toBe("cancelled");
    });

    it("supports failure recovery and retry", async () => {
      const task = await repository.submitTask({ workspaceId: "demo", intent: "Simulate failure for recovery", references: [] });
      expect(task.status).toBe("failed");
      expect(task.interactions[0].kind).toBe("error_recovery");
      expect((await repository.retryTask({ taskId: task.id })).status).toBe("needs_context");
    });
  });
}

repositoryContract("Mock", () => new MockWorkspaceTaskRepository("demo"));
repositoryContract("API", () => {
  const provider = new MockWorkspaceTaskRepository("demo");
  return new ApiWorkspaceTaskRepository("http://contract.test", () => "contract-token", mockFetchAdapter(provider));
});
