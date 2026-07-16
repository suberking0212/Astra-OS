import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const failures = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function assertContains(path, expected, message) {
  assert(read(path).includes(expected), message ?? `${path} is missing: ${expected}`);
}

function assertNotContains(path, forbidden, message) {
  assert(!read(path).includes(forbidden), message ?? `${path} contains stale content: ${forbidden}`);
}

const architecture = "docs/Chinese/mvp/ARCHITECTURE_BASELINE.md";
const presentation = "docs/Chinese/mvp/TASK_PRESENTATION_CONTRACT.md";
const runtime = "docs/Chinese/mvp/RUNTIME_REMEDIATION_SPEC.md";
const visual = "docs/Chinese/mvp/WORKSPACE_VISUAL_BASELINE.md";
const phased = "docs/Chinese/mvp/PHASED_ENGINEERING_DELIVERY_PLAN.md";
const harness = "docs/Chinese/mvp/AI_EMPLOYEE_HARNESS_DESIGN.md";
const historical = "docs/Chinese/mvp/TEMP_WORKSPACE_FIRST_REMEDIATION_PLAN.md";

assertContains(architecture, "AstraOS 是 Enterprise AI Operating System。");
assertContains(visual, "AstraOS 是 Enterprise AI Operating System。");
assertContains(
  presentation,
  "AstraOS = Control Plane + Governance Harness Services + Managed Runtime + Executor Backends",
);

assertNotContains(runtime, "│   ├── User / Organization / Project");
assertContains(runtime, "| `external_agent` |", "RuntimeInvocation does not support external_agent");
assertNotContains(phased, "tool_action_runtime");
assertContains(
  presentation,
  "kind / fields / options / actions / riskLevel",
  "Presentation rendering fields do not match InteractionView",
);
assertNotContains(presentation, "kind / schema / actions");

const harnessSource = read(harness);
assert(
  harnessSource.includes('status: "succeeded" | "partially_succeeded" | "failed" | "cancelled";') &&
    harnessSource.includes("decision_id: string;") &&
    harnessSource.includes("result_type: string;"),
  "Harness TaskResult does not match the Runtime specification",
);
assert(
  harnessSource.indexOf("### Sequence E：Customer Support Employee") <
    harnessSource.indexOf("### Sequence F：ExternalAgentExecutor / Hermes POC"),
  "Harness delivery sequence puts the External Agent POC before the first governed Employee",
);

assertContains(historical, "状态：`superseded`");
assertNotContains(historical, "Agent = Decision + Capability + Policy");
assertContains("astraos_mvp_ui_preview.html", "此 Agent-first UI Preview 已废弃");
assertContains("WORKSPACE_MAIN_UI_COMPONENT_SPEC.md", "当前正式 Workspace 只读取 Auth 和 Project API");

assertContains("README.md", "Python 3.11 or 3.12");
assertContains("services/api/pyproject.toml", 'requires-python = ">=3.11,<3.13"');
assertContains("services/api/uv.lock", 'requires-python = ">=3.11, <3.13"');
assertContains(phased, "| Phase 0 | `accepted` | Gate 0 纠偏后重新验收通过");
assertContains(phased, "| Phase 1 | `not_started` | Gate 0 已重新通过");
assertContains(
  "docs/Chinese/mvp/phase-acceptance/GATE_0_REACCEPTANCE.md",
  "对应纠偏基线 commit：`0953b8c62b03922e581d9374d6f51ebf0f37798b`",
);

if (failures.length > 0) {
  console.error("Document consistency check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Document authority, contracts, and historical boundaries are consistent.");
