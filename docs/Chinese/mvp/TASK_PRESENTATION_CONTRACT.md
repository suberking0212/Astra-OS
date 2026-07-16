# AstraOS Task Presentation Contract

更新时间：2026-07-15

本文档定义 Astra OS Managed Runtime 如何把任务执行语义转换为 Workspace 可展示、可交互、可恢复、可审计的用户交互语义。

它不是前端组件规范，也不是 Hermes / Agent 内部 trace 规范。它是 Managed Runtime 的 Presentation Contract。

## 1. 定位

```text
AstraOS = Control Plane + Governance Harness Services + Managed Runtime + Executor Backends
Hermes / Agent = Executor Backend
Workspace = 用户理解任务、参与任务、接收结果的界面
Interaction Runtime = Managed Runtime 内的用户交互承接层
Presentation Contract = Runtime 到 Workspace 的稳定展示契约
```

Hermes 自带 Agent Harness；Harness 的模型循环、上下文、工具调用、局部重试和 Skills / Subagents 不属于 Presentation Contract，也不进入 Workspace View Model。

`Interaction Runtime` 属于 `Astra OS Managed Runtime`，不属于 Frontend，不属于 API Layer，不属于 Hermes，也不属于模型。

它负责：

- 判断哪些任务状态需要用户参与。
- 持久化等待用户动作的 `InteractionRequest`。
- 接收并校验用户提交的 `InteractionResponse`。
- 驱动 Runtime pause / resume。
- 按可见性边界生成 Workspace View Model。
- 保证刷新、换设备、长时间暂停、审批延迟和服务重启后仍可恢复。

## 2. 主链路

```text
User Task
  -> TaskRequest
  -> TaskDecision
  -> RuntimeInvocation
  -> Executor / Hermes / Tool / Browser
  <-> ExecutorEvent / Interaction Intent / Result Fragment
  <-> Interaction Runtime（需要用户参与时）
      -> Workspace Presentation View
      -> Frontend Renderer
      -> InteractionResponse
      -> Runtime Resume / Control Event
  -> TaskResult
```

Executor / Hermes / Tool / Browser 可以在执行过程中随时产生执行事件、结果片段和交互意图，但不能直接决定 Workspace 组件、按钮、标题、布局或最终 UI 文案。Interaction Runtime 不是固定在 Executor 完成之后才出现；它是 Managed Runtime 内部的横切能力，用于接住缺信息、审批、授权、错误恢复和人工接管，并驱动 Runtime pause / resume / control。

## 3. Runtime-to-Workspace Presentation Boundary

Workspace 只展示用户能理解、能决策、能补充、能验收的内容。

可以展示：

```text
任务目标
当前进度
系统理解了什么
缺少什么信息
需要用户选择什么
需要用户确认什么
为什么需要审批
风险和影响
候选方案
需要人工接管的原因
失败原因
最终结果
下一步建议
```

不能展示：

```text
RuntimeInvocation 原始对象
ToolCall 原始参数
WorkflowRun / StepRun
Executor session
Browser DOM selector
模型 chain-of-thought
raw prompt
MCP trace
cookie / token
内部策略规则
idempotency key
stack trace
```

有些内容可以摘要展示，但不能原样展示：

| 内部事件 | Workspace 展示方向 |
| --- | --- |
| `ToolCall: search_order` | 正在查询订单状态。 |
| `BrowserAction: fill_selector("#passport")` | 正在填写已授权的乘客信息。 |
| `RetryPolicy: timeout_retry` | 上一次查询超时，AstraOS 正在重试。 |
| `ExternalAgentExecutor session resumed` | AstraOS 已继续处理任务。 |

## 4. Visibility Boundary

所有 Runtime 事件、InteractionRequest、结果片段和执行摘要必须带可见性分类。

```text
user_visible      可以进入 Workspace View Model
summarized        只能被转成用户语言后进入 Workspace
internal_only     只能留在 Runtime / Console / Audit
```

规则：

- `user_visible` 内容必须已经脱敏、可解释、可本地化。
- `summarized` 内容必须通过确定性 mapper 转换，不能原样透出。
- `internal_only` 内容禁止进入普通 Workspace API。
- Console / Admin 可以查看更深的治理、观测、审计信息，但仍必须遵守密钥、cookie、token 和隐私数据脱敏规则。

## 5. InteractionRequest

`InteractionRequest` 是任务状态的一部分，不是临时 WebSocket 消息。

```ts
type InteractionRequest = {
  id: string;
  taskId: string;
  runId: string | null;
  stepId: string | null;
  kind: InteractionKind;
  status: "pending" | "submitted" | "resolved" | "cancelled" | "expired";
  blocking: boolean;
  schema: Record<string, unknown> | null;
  payload: Record<string, unknown>;
  actions: InteractionAction[];
  riskLevel: "none" | "low" | "medium" | "high";
  visibility: "user_visible" | "summarized" | "internal_only";
  presentationHint: "inline" | "modal" | "side_panel" | "full_screen" | null;
  reasonCode: string;
  createdAt: string;
  expiresAt: string | null;
};
```

要求：

- `blocking = true` 时，Runtime 必须进入等待态或暂停态。
- `schema` 用于结构化输入、文件请求、选择项和确认项校验。
- `payload` 只能包含符合可见性边界的数据。
- `actions` 必须是用户可执行动作，不是内部 method name。
- `reasonCode` 用于模板化文案、审计和 i18n，不由模型自由生成最终 UI 文案。

## 6. InteractionResponse

用户提交后必须保存 `InteractionResponse`，然后由 Managed Runtime 决定是否 resume。

```ts
type InteractionResponse = {
  id: string;
  interactionId: string;
  taskId: string;
  userId: string;
  action: "submit" | "select" | "approve" | "reject" | "edit" | "takeover" | "cancel";
  data: Record<string, unknown>;
  submittedAt: string;
};
```

要求：

- `interactionId` 必须指向一个未终结的 `InteractionRequest`。
- `data` 必须通过 `schema` 和 action 规则校验。
- 高风险动作必须重新校验权限、审批、幂等和过期时间。
- 用户拒绝、取消或超时后，Runtime 必须进入可解释失败、替代路径或取消状态。

## 7. Interaction Kind Registry

第一版支持这些通用类型：

| Kind | 用途 |
| --- | --- |
| `input` | 请求结构化信息。 |
| `selection` | 请求用户选择候选项。 |
| `confirmation` | 请求确认某个动作或理解。 |
| `approval` | 请求批准高风险、外部副作用或受治理动作。 |
| `result` | 展示结构化结果。 |
| `takeover` | 请求监督或人工接管。 |
| `progress` | 展示任务进度摘要。 |
| `error_recovery` | 请求用户选择恢复方式。 |
| `file_request` | 请求上传或选择文件。 |
| `authentication` | 请求用户完成登录、授权或外部身份验证。 |

新增 kind 必须同时定义：

- Runtime 触发条件。
- schema 和 payload 最小字段。
- 允许 action。
- 默认 riskLevel。
- Workspace View Model 映射。
- 审计字段。
- 过期和恢复规则。

## 8. Schema-driven Rendering Contract

前端唯一消费 `Workspace View Model`，不消费 Runtime 内部对象。

```ts
type WorkspaceTaskView = {
  id: string;
  title: string;
  userIntent: string;
  status:
    | "thinking"
    | "running"
    | "needs_context"
    | "needs_approval"
    | "needs_attention"
    | "completed"
    | "failed"
    | "cancelled";
  progressSummary: string;
  progress: TaskProgressView | null;
  interactions: InteractionView[];
  result: ResultView | null;
};
```

```ts
type TaskProgressView = {
  summary: string;
  currentStep: string | null;
  completedSteps: number;
  totalSteps: number | null;
  updatedAt: string;
};

type InteractionView = {
  id: string;
  taskId: string;
  kind: InteractionKind;
  title: string;
  body: string;
  fields: InteractionFieldView[];
  options: InteractionOptionView[];
  actions: InteractionActionView[];
  riskLevel: "none" | "low" | "medium" | "high";
  expiresAt: string | null;
};

type InteractionFieldView = {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "file";
  required: boolean;
  placeholder: string | null;
};

type InteractionOptionView = {
  value: string;
  label: string;
  description: string | null;
};

type InteractionActionView = {
  action: "submit" | "select" | "approve" | "reject" | "edit" | "takeover" | "cancel";
  label: string;
  emphasis: "primary" | "secondary" | "danger";
};

type ResultView = {
  status: "succeeded" | "partially_succeeded" | "failed" | "cancelled";
  resultType: string;
  summary: string;
  businessObjects: BusinessObjectView[];
  nextActions: string[];
  failureReason: string | null;
};

type BusinessObjectView = {
  type: string;
  id: string;
  label: string;
  url: string | null;
};
```

以上字段是 Phase 1 语义草案；在 Phase 2 的 Mock 闭环、OpenAPI、Pydantic、TypeScript 和 contract tests 验证完成前不构成冻结契约。

Presentation Projector 先把 Runtime `InteractionRequest.schema / payload` 转换为
`InteractionView.fields / options / actions`。前端只按
`kind / fields / options / actions / riskLevel` 渲染通用组件：

```text
input           -> schema form
selection       -> option picker
confirmation    -> confirmation card
approval        -> approval card
result          -> result view
takeover        -> supervision / takeover panel
progress        -> timeline
error_recovery  -> recovery choices
file_request    -> file upload
authentication  -> auth handoff
```

`presentationHint` 只是建议，不是后端命令前端打开某个组件。

## 9. Model Non-Presentation Rule

模型可以生成：

```text
业务内容
候选方案
结果摘要
邮件正文
分析结论
需要字段的语义候选
```

模型不能生成：

```text
组件名
页面布局
按钮文案
弹窗标题
导航结构
风险等级解释
审批模板
错误提示模板
最终 UI 文案
```

正确链路：

```text
Model / Executor
  -> 受约束的语义候选
Interaction Runtime
  -> 校验、归一化、补齐 policy / risk / status
Presentation Mapper
  -> 用确定性规则生成 Workspace View Model
Frontend Renderer
  -> 用本地组件和 i18n 渲染
```

例如模型只能表达：

```json
{
  "intent": "request_user_input",
  "reason_code": "missing_required_fields",
  "fields": ["destination", "date"]
}
```

不能表达：

```text
请打开 FlightSearchForm，标题写“请填写航班信息”，按钮叫“开始搜索”。
```

标题、按钮、说明、风险文案必须来自平台模板：

```text
reason_code -> deterministic copy template -> i18n label
```

## 10. Human-in-the-loop State Machine

```text
running
  -> interaction_created
  -> waiting_for_user / waiting_for_approval / paused
  -> response_submitted
  -> response_validated
  -> runtime_resume
  -> running / succeeded / failed / cancelled
```

状态要求：

- 每个等待用户动作都必须有 `InteractionRequest`。
- 每个用户动作都必须产生 `InteractionResponse`。
- `InteractionRequest.status` 与 Runtime 状态必须能互相解释。
- 高风险动作在批准前不能执行副作用。
- 过期、拒绝、取消和接管都必须进入可审计路径。
- Runtime resume 必须幂等，防止重复提交副作用。

## 11. Runtime-to-Workspace Mapping Rules

后端保证：

- 只返回可展示 View Model。
- 隐藏 `internal_only` 内容。
- 将 `summarized` 内容转成用户语言。
- 每个等待用户动作都有 InteractionRequest。
- 每个用户动作都回写 InteractionResponse。
- 高风险动作带 `riskLevel`、影响说明和允许响应。
- 失败带 `failureReason` 和 `nextActions`。

前端保证：

- 不直接消费 `RuntimeInvocation`、`ToolCall`、`WorkflowRun`、`StepRun`。
- 不根据业务领域硬编码专用组件作为主路径。
- 不让模型驱动 UI。
- 按 `kind / fields / options / actions / riskLevel` 渲染通用组件，不直接解释 Runtime schema。
- 所有用户动作通过 `InteractionResponse` 回写。

## 12. External Execution Adapter Fallback

外部网站差异不由前端解决。

执行降级链由平台策略定义：

```text
Official API Tool
-> MCP / Connector
-> Dedicated Skill
-> Browser Agent
-> Supervised Browser
-> Human Takeover
```

前端只处理：

```text
监督
确认
补充信息
接管
查看结果
```

不同网站的 DOM、字段、流程、登录、验证码，由 Tool / Skill / Browser Adapter / Human Takeover 处理。

## 13. Executor Capability Negotiation

Executor / Hermes / Browser Adapter 必须通过 Executor Capability 声明执行能力。该能力合同属于 `Runtime Adapter ↔ Executor Backend`，只用于任务路由、降级、安全校验和用户参与策略，不能代替 ToolDefinition、Permission、Approval 或 outcome_spec。

```text
supports_tool_calling
supports_browser
supports_subagents
supports_interaction_intent
supports_pause_resume
supports_streaming
supports_sandbox
supports_supervised_browser
supports_auth_handoff
supports_structured_result
supports_redacted_trace
```

Runtime Adapter 根据能力决定：

- 是否允许该 executor 承接任务。
- 是否需要切换到监督模式。
- 是否需要提前请求用户授权。
- 是否需要降级到 Human Takeover。

模型能力属于 `Hermes Agent Harness / Model Adapter ↔ Model`，不属于 Workspace Presentation Contract。Hermes 自带 Harness；模型是否支持 vision、native tool calling、parallel tool calls、structured output 或上下文长度，只能影响 executor 内部执行策略，不能直接决定 Workspace 组件、审批规则或最终 TaskResult。

## 14. Audit / Redaction / Security Rules

必须审计：

- 为什么创建 InteractionRequest。
- 展示给用户的可见内容快照。
- 用户选择了哪个 action。
- response 校验是否通过。
- Runtime 是否 resume。
- 副作用是否提交。
- 失败、拒绝、过期和取消原因。

必须脱敏：

- 密码、cookie、token、session。
- 证件号、支付信息、敏感身份信息。
- 外部网站 DOM 中的敏感字段。
- Tool 原始输入输出中的敏感字段。

禁止：

- 将模型 chain-of-thought 写入 Workspace。
- 将 raw prompt 当成用户可见说明。
- 将 MCP trace、Browser selector、stack trace 暴露给普通用户。
- 用模型自由文本解释高风险权限或审批义务。

## 15. 文档分工

- `ARCHITECTURE_BASELINE.md` 定义 Interaction Runtime 的架构归属。
- `RUNTIME_REMEDIATION_SPEC.md` 定义 InteractionRequest、InteractionResponse、暂停恢复、状态机、可见性和审计的工程要求。
- `PHASED_ENGINEERING_DELIVERY_PLAN.md` 定义 Task Presentation Contract 的交付阶段。
- `WORKSPACE_VISUAL_BASELINE.md` 定义 Workspace 只渲染 Presentation View，不展示 executor trace。
