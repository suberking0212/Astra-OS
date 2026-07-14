# 临时工程文档：Task-first Agent 完整设计预期

更新时间：2026-07-14

本文档记录 AstraOS 当前阶段对 Agent / AI Employee 的预期设计。核心判断是：

```text
AstraOS 的产品目标是完成用户交付的 Task，不是展示、堆叠或管理更多 Agent。
```

Agent / AI Employee 是完成 Task 的执行组织形式，不是产品目的本身。用户不应该被迫理解 Agent、Workflow、Run、ToolCall 等内部对象，才知道一个任务怎么完成。

## 1. 当前最大问题

当前系统缺少强有力的任务决策层。

用户输入一个需求后，系统不能稳定判断：

- 是否可以直接回答。
- 是否需要追问用户。
- 是否需要启动完整工作流。
- 应该启动哪个工作流。
- 需要哪些上下文。
- 需要哪些权限。
- 哪些动作必须审批。
- 最终结果应该以什么形式交付。

因此当前 Employee 更像自动化程序机，而不是智能任务执行者。

## 2. 产品原则

错误方向：

```text
User -> pick Agent -> pick Workflow -> run Tool -> inspect Run
```

正确方向：

```text
User -> submit Task -> system decides path -> execute safely -> deliver Result
```

AstraOS 应该围绕 Task 设计，而不是围绕 Agent 数量设计。

Agent 的正确定位：

```text
Agent = role + capability + policy + memory + execution profile
```

但 Agent 不是用户任务路径的起点。任务路径的起点是 Task。

## 3. 预期工程架构

完整 Agent 系统应由以下层组成：

```text
Task Intake Layer
  -> Employee Decision Layer
  -> Context Layer
  -> Policy / Permission Layer
  -> Planning Layer
  -> Runtime / Orchestration Layer
  -> Tool / Connector Layer
  -> Human Approval Layer
  -> Result / Outcome Layer
  -> Evaluation / Observability Layer

Employee Identity Layer 横向约束整个过程。
```

## 4. Task Intake Layer

职责：

- 接收用户自然语言输入。
- 记录输入来源。
- 绑定 Workspace / user / session。
- 创建待决策 TaskRequest。
- 不直接假设一定要启动某个 Agent 或 Workflow。

输入示例：

```text
帮我把这张 Apple 订单加入购买记录，并提醒 AppleCare 截止时间。
这个账单是什么？
帮我总结这段会议纪要。
这个问题怎么解决？
```

建议代码对象：

```ts
type TaskRequest = {
  id: string;
  workspace_id: string;
  user_id: string;
  source: "workspace" | "api" | "automation" | "chat";
  raw_input: string;
  attachments: TaskAttachmentRef[];
  created_at: string;
  metadata: Record<string, unknown>;
};
```

字段要求：

- `raw_input` 必须保留用户原始输入。
- `source` 必须记录入口，便于评估不同入口的决策质量。
- `attachments` 只能存引用，不直接把文件内容塞进主对象。
- 这一层不写 `workflow_template_key` 作为必填字段。

## 5. Employee Decision Layer

这是当前最需要补的核心层。

职责：

- 理解用户意图。
- 判断任务是否可以直接回答。
- 判断是否需要追问。
- 判断是否需要完整工作流。
- 选择合适的 Workflow / Tool path。
- 判断需要读取哪些上下文。
- 判断需要哪些权限。
- 判断哪些动作必须审批。
- 定义结果标准。
- 将决策交给 Planning / Runtime。

四类基础决策：

```text
direct_answer
ask_clarification
start_workflow
unsupported
```

建议代码对象：

```ts
type EmployeeDecision =
  | DirectAnswerDecision
  | AskClarificationDecision
  | StartWorkflowDecision
  | UnsupportedDecision;

type DecisionBase = {
  id: string;
  task_request_id: string;
  workspace_id: string;
  selected_employee_id: string | null;
  decision: "direct_answer" | "ask_clarification" | "start_workflow" | "unsupported";
  intent: string;
  confidence: number;
  reason: string;
  risk_level: "low" | "medium" | "high";
  required_context: ContextRequirement[];
  required_permissions: PermissionRequirement[];
  required_approvals: ApprovalRequirement[];
  missing_information: MissingInformation[];
  outcome_spec: OutcomeSpec;
  created_at: string;
};

type DirectAnswerDecision = DecisionBase & {
  decision: "direct_answer";
  answer_draft: string;
};

type AskClarificationDecision = DecisionBase & {
  decision: "ask_clarification";
  questions: ClarificationQuestion[];
};

type StartWorkflowDecision = DecisionBase & {
  decision: "start_workflow";
  workflow_template_key: string;
  workflow_input: Record<string, unknown>;
};

type UnsupportedDecision = DecisionBase & {
  decision: "unsupported";
  user_message: string;
  alternatives: string[];
};
```

字段要求：

- `decision` 必须是枚举，不能用自由文本。
- `confidence` 必须有数值，后续用于评估错误路由。
- `reason` 必须解释为什么这么决策，供审计和调试。
- `selected_employee_id` 可以为空，因为系统应先理解 Task，再决定是否需要某个 Employee 执行。
- `workflow_template_key` 只能在 `start_workflow` 下出现。
- `required_permissions` 必须是结构化对象，不能只是字符串数组。
- `required_approvals` 必须表达审批发生在哪个动作前。
- `outcome_spec` 必须存在，因为产品衡量的是 Task 是否完成，而不是 Run 是否结束。
- Decision Layer 不允许直接调用 Tool、写业务表或修改 Runtime 状态。
- Decision Layer 只能产出结构化决策，由 Planning / Runtime 继续处理。

### 5.1 Agent 与 Runtime 的耦合边界

Agent / AI Employee 与 Runtime 必须是“契约耦合”，不能是“代码硬耦合”。

正确耦合点：

```text
EmployeeDecision
TaskPlan
RuntimeInvocation
WorkflowTemplate
ToolDefinition
PermissionRequirement
ApprovalRequirement
OutcomeSpec
RuntimeResumeEvent
```

禁止耦合点：

```text
Agent prompt 直接调用数据库
Agent 直接决定 AppRun / StepRun 状态
Agent 绕过 ToolExecutor 写业务表
Agent 直接执行外部动作
Runtime 硬编码某个 Agent 的 prompt 或人格
```

核心原则：

```text
Agent 负责做出结构化决策。
Runtime 负责执行结构化决策。
Tool 负责受控副作用。
Outcome 负责判断用户任务是否真正完成。
```

### 5.2 RuntimeInvocation

`EmployeeDecision` 不能直接进入执行器。进入 Runtime 前必须被转换为 `RuntimeInvocation`。

建议代码对象：

```ts
type RuntimeInvocation = {
  id: string;
  task_request_id: string;
  decision_id: string;
  task_id: string;
  workspace_id: string;
  selected_employee_id: string | null;
  invocation_type: "direct_answer" | "clarification" | "workflow";
  workflow_template_key: string | null;
  workflow_input: Record<string, unknown>;
  context_bundle_id: string | null;
  permission_grant_ids: string[];
  approval_requirements: ApprovalRequirement[];
  outcome_spec: OutcomeSpec;
  created_at: string;
};
```

字段要求：

- `invocation_type = workflow` 时，`workflow_template_key` 必须存在。
- `invocation_type = direct_answer` 时，可以不创建完整 `AppRun`，但必须创建 `TaskOutcome` 或等价结果记录。
- `permission_grant_ids` 必须绑定当前 Task，不允许使用永久 Agent 授权。
- `approval_requirements` 必须传给 Runtime，Runtime 在写操作前强制拦截。
- `outcome_spec` 必须随 invocation 进入 Runtime，不能只存在于前端展示。

## 6. Context Layer

职责：

- 根据决策层的 `required_context` 按需取上下文。
- 提供 Workspace、用户偏好、知识库、附件、历史任务、Employee memory。
- 避免无脑把所有上下文塞给模型。

建议代码对象：

```ts
type ContextRequirement = {
  key: string;
  type:
    | "workspace_profile"
    | "user_preference"
    | "knowledge_base"
    | "attachment"
    | "conversation_history"
    | "task_history"
    | "employee_memory"
    | "business_object";
  required: boolean;
  reason: string;
  scope: "current_task" | "workspace" | "employee" | "user";
};

type ContextBundle = {
  id: string;
  task_request_id: string;
  decision_id: string;
  items: ContextItem[];
  redactions: ContextRedaction[];
  created_at: string;
};
```

字段要求：

- Context 必须可审计：知道取了什么、为什么取、属于哪个 scope。
- 私有数据必须经过 Policy / Permission Layer 检查后才能读取。
- ContextBundle 应记录 redaction，避免模型看到不必要的敏感信息。

## 7. Policy / Permission Layer

职责：

- 判断本次 Task 可以读什么。
- 判断本次 Task 可以写什么。
- 判断哪些动作禁止。
- 判断哪些动作需要审批。
- 把权限绑定到单个 Task，而不是永久给 Agent 放权。

建议代码对象：

```ts
type PermissionRequirement = {
  key: string;
  action: string;
  resource_type: string;
  resource_scope: "current_task" | "workspace" | "external_account";
  required: boolean;
  reason: string;
};

type TaskPermissionGrant = {
  id: string;
  task_id: string;
  workspace_id: string;
  granted_by_user_id: string;
  allowed_data_scopes: string[];
  allowed_actions: string[];
  denied_actions: string[];
  expires_at: string | null;
  created_at: string;
};
```

购买记录任务示例：

```json
{
  "allowed_data_scopes": ["attachments"],
  "allowed_actions": ["create_purchase_record", "create_reminder"],
  "denied_actions": ["contact_merchant", "send_email"],
  "expires_at": null
}
```

字段要求：

- 权限必须绑定 `task_id`。
- `denied_actions` 必须显式存在，不能只靠默认拒绝。
- 写入业务对象前必须能被审批层拦截。
- 普通用户不应该看到内部 policy key，但 UI 必须解释权限含义。

## 8. Planning Layer

职责：

- 把决策变成用户可理解、Runtime 可执行的 TaskPlan。
- 明确步骤、权限、审批点、成功标准和失败处理。
- 让用户知道系统准备如何完成任务。

建议代码对象：

```ts
type TaskPlan = {
  id: string;
  task_id: string;
  decision_id: string;
  goal: string;
  steps: TaskPlanStep[];
  required_permissions: PermissionRequirement[];
  required_approvals: ApprovalRequirement[];
  success_criteria: string[];
  failure_modes: string[];
  status: "draft" | "waiting_permission" | "ready" | "running" | "completed" | "failed";
  created_at: string;
  updated_at: string;
};

type TaskPlanStep = {
  key: string;
  label: string;
  description: string;
  kind: "context" | "reasoning" | "tool" | "approval" | "write" | "result";
  requires_approval: boolean;
  tool_key: string | null;
};
```

字段要求：

- `goal` 必须面向用户，而不是内部 workflow 描述。
- `steps` 必须能映射到 Runtime，但不能把 Runtime step 原样暴露给用户。
- `success_criteria` 必须是用户结果标准。
- `status` 必须能驱动 Workspace UI。

## 9. Runtime / Orchestration Layer

职责：

- 根据 Decision + TaskPlan 执行任务。
- 调用 Workflow runner / Step runner / Tool executor。
- 处理重试、暂停、恢复和失败。
- 在审批后 resume。
- 产生可审计 Run / Step / ToolCall。

建议代码对象：

```ts
type TaskRun = {
  id: string;
  task_id: string;
  decision_id: string;
  app_run_id: string | null;
  workflow_template_key: string | null;
  status:
    | "queued"
    | "running"
    | "waiting_for_user"
    | "waiting_for_approval"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";
  current_step_key: string | null;
  wait_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
};
```

字段要求：

- Runtime 对象可以保留内部 ID，但普通用户 UI 不以 ID 作为操作对象。
- `workflow_template_key` 允许为空，因为 direct answer 不需要 workflow。
- `app_run_id` 是内部 Runtime Trace 入口，不作为普通用户主操作对象。
- `waiting_for_user` / `waiting_for_approval` / `paused` 必须是一等状态。
- `TaskRun.status` 面向产品体验，内部必须映射到 `AppRun.status`。
- Run 成功不等于 Task 成功，最终要看 Outcome。

Runtime 接收对象必须是 `RuntimeInvocation`，而不是原始 prompt 或未校验的 Agent 文本输出。

```text
TaskRequest
  -> EmployeeDecision
  -> ContextBundle
  -> TaskPermissionGrant
  -> TaskPlan
  -> RuntimeInvocation
  -> AppRun / StepRun / ToolCall
  -> TaskOutcome
```

## 10. Tool / Connector Layer

职责：

- 执行真实动作。
- 读取数据、抽取字段、写入业务对象、创建提醒、调用外部系统。
- 所有 ToolCall 都必须受 Policy / Permission / Approval 约束。

建议代码对象：

```ts
type ToolDefinition = {
  key: string;
  display_name: string;
  description: string;
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  required_permissions: PermissionRequirement[];
  approval_required: boolean;
  risk_level: "low" | "medium" | "high";
};

type ToolCallRecord = {
  id: string;
  task_run_id: string;
  tool_key: string;
  input_redacted: Record<string, unknown>;
  output_redacted: Record<string, unknown> | null;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};
```

字段要求：

- Tool 不是 Agent。
- Tool 必须声明权限和风险等级。
- ToolCall 记录必须支持审计，但不作为普通用户主体验。

## 11. Human Approval Layer

职责：

- 在高风险写入、外部动作、不可逆操作前暂停。
- 用业务语言展示即将发生的动作。
- 用户批准后 Runtime resume。
- 用户拒绝后 Task 进入可解释失败或替代路径。

建议代码对象：

```ts
type ApprovalRequirement = {
  key: string;
  action: string;
  resource_type: string;
  reason: string;
  required_before_step: string;
};

type TaskApproval = {
  id: string;
  task_id: string;
  workspace_id: string;
  approval_type: string;
  proposed_action: string;
  proposed_diff: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decided_by_user_id: string | null;
  decided_at: string | null;
  created_at: string;
};
```

购买记录审批示例 UI 应展示：

```text
我准备创建这条购买记录：
商家：Apple
金额：1299
订单号：xxx
提醒：AppleCare 截止前提醒

是否确认？
```

字段要求：

- `proposed_diff` 必须记录即将写入的业务字段。
- 审批卡片必须用业务语言展示，不要求用户理解 approval ID。
- 审批通过后必须能关联到后续写入结果。

## 12. Result / Outcome Layer

职责：

- 判断 Task 是否真正完成。
- 交付用户可理解的结果。
- 关联业务对象。
- 给出失败原因和下一步建议。

建议代码对象：

```ts
type TaskOutcome = {
  id: string;
  task_id: string;
  decision_id: string;
  status: "succeeded" | "partially_succeeded" | "failed" | "cancelled";
  result_type: string;
  summary: string;
  business_objects: BusinessObjectRef[];
  next_actions: string[];
  failure_reason: string | null;
  created_at: string;
};

type BusinessObjectRef = {
  type: "purchase_record" | "purchase_item" | "owned_asset" | "reminder" | "support_ticket" | "document" | "external_object";
  id: string;
  label: string;
};
```

字段要求：

- Outcome 是产品验收对象。
- `TaskRun.status = completed` 不代表 `TaskOutcome.status = succeeded`。
- Workspace 应展示 Outcome，而不是展示 Run Trace。

## 13. Evaluation / Observability Layer

职责：

- 评估决策是否正确。
- 评估是否错误启动工作流。
- 评估是否漏问澄清问题。
- 评估是否请求了过多权限。
- 评估是否成功交付结果。
- 记录用户是否修改、拒绝或撤销审批。

建议代码对象：

```ts
type DecisionEvaluation = {
  id: string;
  task_id: string;
  decision_id: string;
  expected_decision: "direct_answer" | "ask_clarification" | "start_workflow" | "unsupported" | null;
  actual_decision: "direct_answer" | "ask_clarification" | "start_workflow" | "unsupported";
  decision_correct: boolean | null;
  permission_overrequested: boolean | null;
  clarification_missing: boolean | null;
  outcome_successful: boolean | null;
  reviewer: "system" | "user" | "admin";
  notes: string | null;
  created_at: string;
};
```

字段要求：

- 不能只监控 Token 和错误率。
- 必须监控决策质量。
- 必须能回答“这个 Task 为什么走了这个路径”。

## 14. Employee Identity Layer

职责：

- 定义 AI Employee 的岗位、能力、边界、默认工具、记忆范围和语气。
- 横向约束决策、权限、执行和结果。
- 不作为用户完成任务时必须手动选择的唯一入口。

建议代码对象：

```ts
type EmployeeIdentity = {
  id: string;
  workspace_id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  supported_intents: string[];
  workflow_template_keys: string[];
  tool_keys: string[];
  default_permission_profile: string;
  memory_scope: "none" | "task" | "workspace" | "user";
  policy_profile_key: string;
  status: "draft" | "active" | "disabled";
};
```

字段要求：

- `supported_intents` 比“Agent 名字”更重要。
- `workflow_template_keys` 是执行能力，不是用户主心智。
- `default_permission_profile` 必须存在，不能让 Agent 默认无限授权。
- `memory_scope` 必须显式声明。

## 15. Phase 4A 最小落地

Phase 4A 当前不应该继续新增 Agent 类型，而应该先补 Task-first 决策路径。

最小链路：

```text
User input
  -> TaskRequest
  -> EmployeeDecision
  -> ContextBundle
  -> TaskPlan
  -> TaskPermissionGrant
  -> RuntimeInvocation
  -> TaskRun
  -> TaskApproval(waiting point)
  -> RuntimeResumeEvent
  -> ToolCall
  -> TaskOutcome
```

说明：

- `required_approvals` 在 `EmployeeDecision` / `TaskPlan` / `RuntimeInvocation` 中表达审批要求。
- `TaskApproval` 通常由 Runtime 执行到审批步骤时创建。
- 用户批准或拒绝后，通过 `RuntimeResumeEvent` 恢复或终止后续写操作。

购买记录任务的最小决策：

```json
{
  "decision": "start_workflow",
  "intent": "purchase_record_intake",
  "confidence": 0.86,
  "workflow_template_key": "purchase_record_intake_v1",
  "required_permissions": [
    {
      "key": "read_order_attachment",
      "action": "read",
      "resource_type": "attachment",
      "resource_scope": "current_task",
      "required": true,
      "reason": "Need to extract purchase fields from the order evidence."
    },
    {
      "key": "create_purchase_record",
      "action": "create",
      "resource_type": "purchase_record",
      "resource_scope": "workspace",
      "required": true,
      "reason": "Need to write the confirmed purchase record."
    }
  ],
  "required_approvals": [
    {
      "key": "confirm_purchase_record_before_write",
      "action": "create_purchase_record",
      "resource_type": "purchase_record",
      "reason": "Writing purchase data requires human confirmation.",
      "required_before_step": "commit_purchase_record"
    }
  ],
  "missing_information": [],
  "risk_level": "medium",
  "outcome_spec": {
    "result_type": "purchase_record_with_reminder",
    "success_criteria": [
      "purchase record is created",
      "purchase items are extracted",
      "owned assets are created when applicable",
      "AppleCare reminder is created",
      "final result is visible in workspace"
    ]
  }
}
```

## 16. 本阶段不应继续做什么

本阶段不要继续：

- 用新增 Agent 数量代替任务完成能力。
- 让用户手动选择 Workflow。
- 让用户手动复制 Project ID / AIApp ID / Ticket ID / Run ID。
- 把 Console 当成任务执行入口。
- 把固定脚本跑通当成智能 Employee。
- 只展示 Run 成功，不展示 Outcome 成功。
- 只监控 Token 和错误率，不评估决策正确性。
- 让 Agent 决策层直接执行 Tool 或修改 Runtime 状态。
- 让 Runtime 依赖 Agent prompt 文本判断下一步。

## 17. 验收标准

本轮整改是否正确，只看一个问题：

```text
用户提出一个 Task 后，系统是否能判断该怎么完成，并把任务推进到结果。
```

具体标准：

- 简单问题可以直接回答。
- 信息不足时会追问。
- 购买记录任务会自动进入购买记录工作流。
- 写入业务对象前会请求权限和审批。
- Runtime 只执行结构化 `RuntimeInvocation`，不执行自由文本 Agent 输出。
- `waiting_for_approval` 在 TaskRun 和 AppRun 中语义一致。
- 用户不需要理解内部对象。
- 最终结果在 Workspace 中交付。
- Console 只用于看板、审计和调试。

## 18. 结论

AstraOS 下一阶段的核心不是“更多 Agent”，而是：

```text
Task-first
Decision Layer first
Agent as executor, not product goal
Outcome as product success, not Run completion
```
