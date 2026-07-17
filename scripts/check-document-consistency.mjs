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

function normalizeContract(source) {
  return source.replace(/\s+/g, " ").trim();
}

function extractObjectType(path, typeName) {
  const match = read(path).match(new RegExp(`type ${typeName} = \\{([\\s\\S]*?)\\n\\};`));
  assert(match, `${path} is missing object type ${typeName}`);
  return match ? normalizeContract(match[1]) : "";
}

function extractUnionType(path, typeName) {
  const match = read(path).match(new RegExp(`type ${typeName} =([\\s\\S]*?);`));
  assert(match, `${path} is missing union type ${typeName}`);
  return match ? normalizeContract(match[1]) : "";
}

const architecture = "docs/Chinese/mvp/ARCHITECTURE_BASELINE.md";
const scopeRoadmap = "docs/Chinese/mvp/MVP_SCOPE_AND_LONG_TERM_ROADMAP.md";
const presentation = "docs/Chinese/mvp/TASK_PRESENTATION_CONTRACT.md";
const runtime = "docs/Chinese/mvp/RUNTIME_REMEDIATION_SPEC.md";
const visual = "docs/Chinese/mvp/WORKSPACE_VISUAL_BASELINE.md";
const phased = "docs/Chinese/mvp/PHASED_ENGINEERING_DELIVERY_PLAN.md";
const harness = "docs/Chinese/mvp/AI_EMPLOYEE_HARNESS_DESIGN.md";
const historical = "docs/Chinese/mvp/TEMP_WORKSPACE_FIRST_REMEDIATION_PLAN.md";
const supplementalAudit = "docs/Chinese/mvp/phase-acceptance/GATE_0_SUPPLEMENTAL_CONSISTENCY_AUDIT.md";
const gate1Acceptance = "docs/Chinese/mvp/phase-acceptance/GATE_1_ACCEPTANCE.md";
const gate1Reacceptance = "docs/Chinese/mvp/phase-acceptance/GATE_1_REACCEPTANCE.md";
const gate2Acceptance = "docs/Chinese/mvp/phase-acceptance/GATE_2_ACCEPTANCE.md";

assertContains(architecture, "AstraOS 是 Enterprise AI Operating System。");
assertContains(visual, "AstraOS 是 Enterprise AI Operating System。");
assertContains(
  presentation,
  "AstraOS = Control Plane + Governance Harness Services + Managed Runtime + Executor Backends",
);

assertContains(scopeRoadmap, "Gate 4 accepted", "MVP scope document does not define the MVP exit");
assertContains(scopeRoadmap, "`[MVP-CONTRACT]`", "MVP scope document does not define contract-only capabilities");
assertContains(scopeRoadmap, "`[POST-MVP-P5]`", "MVP scope document does not define Post-MVP Phase 5");
assertContains(scopeRoadmap, "`[DEFERRED]`", "MVP scope document does not define deferred capabilities");
assertContains(scopeRoadmap, "Assignment Queue / Human Work Inbox", "MVP scope document does not defer human assignment");
assertContains(scopeRoadmap, "Organization / Membership", "MVP scope document does not classify team collaboration");

const scopeAwareDocs = [
  scopeRoadmap,
  architecture,
  presentation,
  runtime,
  visual,
  phased,
  harness,
  "docs/Chinese/mvp/REBUILT_ENGINEERING_BASELINE.md",
  "WORKSPACE_MAIN_UI_COMPONENT_SPEC.md",
  "README.md",
];

for (const path of scopeAwareDocs.filter((path) => path !== scopeRoadmap)) {
  assertContains(path, "MVP_SCOPE_AND_LONG_TERM_ROADMAP.md", `${path} does not reference the implementation scope authority`);
}

const allowedScopeMarkers = new Set([
  "[CURRENT]",
  "[MVP-P1]",
  "[MVP-P2]",
  "[MVP-P3]",
  "[MVP-P4]",
  "[MVP-CONTRACT]",
  "[POST-MVP-P5]",
  "[DEFERRED]",
  "[PROHIBITED]",
]);

for (const path of scopeAwareDocs) {
  const markers = read(path).match(/\[(?:CURRENT|MVP-[A-Z0-9/-]+|POST-MVP-P5|DEFERRED|PROHIBITED)\]/g) ?? [];
  for (const marker of markers) {
    assert(allowedScopeMarkers.has(marker), `${path} uses an unknown implementation scope marker: ${marker}`);
  }
}

assertNotContains(runtime, "│   ├── User / Organization / Project");
assertContains(runtime, "| `external_agent` |", "RuntimeInvocation does not support external_agent");
assertContains(runtime, "| `human` |", "RuntimeInvocation does not support direct human routing");
assertContains(runtime, "| HumanExecutor | Human Executor Adapter |", "Runtime adapter does not map HumanExecutor");
assertContains(runtime, "Direct Human Routing", "Runtime specification does not distinguish direct human routing");
assertContains(runtime, "Approval 只改变受治理动作是否允许继续", "Runtime specification conflates approval with human execution");
assertNotContains(phased, "tool_action_runtime");
assertContains(phased, "RuntimeInvocation(invocation_type = human)", "Phase plan does not include direct human routing");
assertContains(phased, "Phase 1 只实现产品形态、语义草案和隔离 Preview");
assertContains(phased, "正式建立或冻结 `WorkspaceTaskRepository`");
assertContains(phased, "实现完整 Mock Interaction Runtime、通用 schema-driven Interaction Renderer");
assertContains(
  phased,
  "Gate 1 不以 `WorkspaceTaskRepository`、通用 Interaction Renderer、Mock Runtime、OpenAPI 或 contract tests 已完成为验收条件",
);
assertContains(phased, "Phase 2 正式承接 Phase 1 只预留的 Repository composition seam");
assertContains(phased, "产品 MVP Exit", "Phase plan does not define Gate 4 as the MVP exit");
assertContains(phased, "真实 Human Work assignment、claim、reassign、SLA 和结果回收属于 `[DEFERRED]`", "Phase plan does not defer real human work assignment");
assertContains(phased, "范围标记：`[POST-MVP-P5]`", "Phase 5 is not marked Post-MVP");
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
  harnessSource.includes('"external_agent" | "workflow" | "human"') &&
    harnessSource.includes('"direct_model_runtime" | "workflow_runtime" | "agent_runtime" | "human_executor"'),
  "Harness invocation types and executor preferences do not both support human execution",
);
assertContains(harness, "| HumanExecutor | Human Executor Adapter |", "Harness does not map HumanExecutor");
assert(
  harnessSource.indexOf("### Sequence E：Customer Support Employee") <
    harnessSource.indexOf("### Sequence F：ExternalAgentExecutor / Hermes POC"),
  "Harness delivery sequence puts the External Agent POC before the first governed Employee",
);

assertContains(historical, "状态：`superseded`");
assertNotContains(historical, "Agent = Decision + Capability + Policy");
assertContains("astraos_mvp_ui_preview.html", "此 Agent-first UI Preview 已废弃");
assertContains("WORKSPACE_MAIN_UI_COMPONENT_SPEC.md", "当前正式 Workspace 使用 `ApiWorkspaceTaskRepository`");

assertContains(architecture, "MVP 必须落地四类逻辑模块");
assertContains(architecture, "Governance 内部模块");
assertNotContains(architecture, "MVP 只完整实现三块");
assertContains(architecture, "Queue（按需启用）");
assertContains(runtime, "Queue（按需启用）");
assertContains(harness, "Queue（按需启用）");
assertContains("README.md", "Optional Queue");
assertContains("README.md", "It is not part of the current MVP deployment dependencies.");
assertContains(presentation, "直接人工路由不创建此 Interaction");
assertContains(presentation, "`approval` 与 `takeover` 不得混用");
assertContains(runtime, "策略能够自动决定的人工升级不创建无用户动作的 InteractionRequest");
assertContains(runtime, "### 14.2 MVP Contract Only");
assertContains(runtime, "不实现真实团队分派、认领、转派、SLA 或人工执行 production 主路径");
assertContains(presentation, "真实 Human Work 流程 `[DEFERRED]`");
assertNotContains(
  "apps/web/src/mock/preview/workspace/phase1-task-preview.ts",
  "support queue",
  "Preview conflates a support follow-up item with an infrastructure or assignment queue",
);

for (const contractName of ["InteractionKind", "InteractionAction"]) {
  const presentationContract = extractUnionType(presentation, contractName);
  assert(
    presentationContract === extractUnionType(runtime, contractName) &&
      presentationContract === extractUnionType(harness, contractName),
    `${contractName} differs across Presentation, Runtime, and Harness documents`,
  );
}

for (const contractName of ["InteractionRequest", "InteractionResponse"]) {
  const presentationContract = extractObjectType(presentation, contractName);
  assert(
    presentationContract === extractObjectType(runtime, contractName) &&
      presentationContract === extractObjectType(harness, contractName),
    `${contractName} differs across Presentation, Runtime, and Harness documents`,
  );
}

assertContains(
  "docs/Chinese/mvp/phase-acceptance/GATE_0_REACCEPTANCE.md",
  "本记录只证明 commit `0953b8c62b03922e581d9374d6f51ebf0f37798b` 在当次重新验收范围内通过",
);
assertContains(supplementalAudit, "当前审计状态：`accepted`");
assertContains(supplementalAudit, "Commit 绑定：`4b91137a221cc598e6ecb5ae01de15f3599eb005`");
assertContains(supplementalAudit, "本补充审计不撤销 Gate 0，不改变 Phase 状态");
assertContains(phased, "GATE_0_SUPPLEMENTAL_CONSISTENCY_AUDIT.md");
assertContains("docs/Chinese/mvp/REBUILT_ENGINEERING_BASELINE.md", "GATE_0_SUPPLEMENTAL_CONSISTENCY_AUDIT.md");

assertContains("README.md", "Python 3.11 or 3.12");
assertContains("services/api/pyproject.toml", 'requires-python = ">=3.11,<3.13"');
assertContains("services/api/uv.lock", 'requires-python = ">=3.11, <3.13"');
assertContains(phased, "| Phase 0 | `accepted` | Gate 0 纠偏后重新验收通过");
assertContains(phased, "| Phase 1 | `accepted` | Gate 1 整改后重新验收通过");
assertContains(phased, "| Phase 2 | `accepted` | Gate 2 验收通过");
assertContains(phased, "| Phase 3 | `not_started` | Gate 2 已通过");
assertContains(phased, "GATE_1_REACCEPTANCE.md");
assertContains(gate1Acceptance, "验收结论：`not_accepted`");
assertContains(gate1Acceptance, "Phase 1 状态：`in_progress`");
assertContains(gate1Acceptance, "Phase 2 状态：`blocked`");
assertContains(gate1Reacceptance, "验收结论：`accepted`");
assertContains(gate1Reacceptance, "Phase 1 状态：`accepted`");
assertContains(gate1Reacceptance, "Phase 2 状态：`not_started`");
assertContains(gate2Acceptance, "验收结论：`accepted`");
assertContains(gate2Acceptance, "Phase 2 状态：`accepted`");
assertContains(gate2Acceptance, "Phase 3 状态：`not_started`");
assertContains(gate2Acceptance, "对应实现 commit：`77f617e5c21d25afb70d54bd5b0d2ea35747330a`");
assertContains(gate2Acceptance, "TD-04：project / workspace 命名");
assertContains(gate2Acceptance, "TD-06：dev.sh 端口清理");
assertContains(
  gate1Reacceptance,
  "对应整改实现 commit：`8b07f5ccb862989ebe402dac8323b65c136d9548`",
);
assertContains(
  "docs/Chinese/mvp/REBUILT_ENGINEERING_BASELINE.md",
  "整改后的正式通过记录位于 `phase-acceptance/GATE_1_REACCEPTANCE.md`",
);
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
