# AstraOS 分阶段工程落实计划

更新时间：2026-07-16

本文档定义 AstraOS 大范围重构后的新工程基线，以及从 Phase 0 到第一个可评估、可治理的真实 AI Employee 的交付顺序。

当前所有旧实现、旧 Preview、旧启动文案和旧 Phase 标记都视为重构前遗留资产。它们可以被盘点、复用或删除，但不能作为新 Phase 已完成的证据。

主架构以 `ARCHITECTURE_BASELINE.md` 为准。任务展示语义以 `TASK_PRESENTATION_CONTRACT.md` 为准。Runtime 规格以 `RUNTIME_REMEDIATION_SPEC.md` 为准。Workspace 视觉边界以 `WORKSPACE_VISUAL_BASELINE.md` 为准。本文件只定义阶段、依赖关系、交付物和验收 Gate。

## 1. 当前状态

| Phase | 状态 | 说明 |
| --- | --- | --- |
| Phase 0 | `in_progress` | 原 Gate 0 验收因文档语义冲突被撤销，正在完成纠偏与重新验收 |
| Phase 1 | `blocked` | 等待 Gate 0 重新验收通过 |
| Phase 2 | `blocked` | 等待 Phase 1 验收 |
| Phase 3 | `blocked` | 等待 Phase 2 验收 |
| Phase 4 | `blocked` | 等待 Phase 3 验收 |
| Phase 5 | `blocked` | 等待 Phase 4 验收 |

阶段状态只能使用：

```text
not_started
in_progress
accepted
blocked
superseded
```

状态规则：

- 本节是阶段状态的唯一文档权威来源。
- 只有对应 Phase 的验收记录通过后，状态才能变为 `accepted`。
- 代码常量、目录名、路由名、Preview 标题、README、启动脚本文案和历史 commit 都不能单独证明 Phase 状态。
- 大范围重构使既有验收失效时，原验收应标记为 `superseded`，相关 Phase 回到 `not_started`。
- 后续 Phase 可以做不影响架构决策的探索，但在前置 Gate 未通过前不得宣称开始正式交付。

## 2. 核心原则

### 2.1 产品与 Runtime 的顺序

```text
Workspace 先定义用户如何理解任务。
Presentation Contract 定义 Runtime 如何表达可展示、可交互、可恢复的任务状态。
Runtime 再把这些状态可靠地变成业务结果。
```

Workspace 只呈现：

- 用户意图。
- 业务进度。
- 需要用户判断或补充的事项。
- 风险和失败恢复选项。
- 最终交付结果。

`TaskDecision`、`RuntimeInvocation`、`ToolCall`、`WorkflowRun`、`ApprovalRequest`、`PermissionGrant`、`AuditLog` 和 Executor trace 默认不得成为普通用户界面的导航、按钮、卡片或文案。

### 2.2 纵向切片优先

每个工程 Phase 必须形成可以独立验证的纵向能力，不能只以“文档完成”“类型写完”或“后端完成”作为交付结果。

```text
产品体验
  -> 用户交互语义
  -> API / View Model
  -> Runtime 状态
  -> Executor 行为
  -> 持久化与恢复
  -> 验收场景
```

### 2.3 契约先验证、后冻结

Presentation Contract 在 Phase 1 形成草案，在 Phase 2 经过 Mock 闭环验证后才正式冻结。

禁止在未经实际交互验证前同时宣称语义契约、OpenAPI 和共享类型已经冻结。

### 2.4 安全不变量前置

最小治理不是 Runtime 完成后的附加功能。从第一个真实 Tool 执行开始，必须满足：

- Tool 默认不可用，只能调用显式注册并授权的 Tool。
- read / write / external side effect 必须明确分类。
- 每次执行都具有稳定的 Task、Invocation 和 operation identity。
- 写操作默认拒绝，除非经过 approval 和 idempotency 控制。
- 所有真实执行至少生成基础审计事件。
- 重试和用户重复提交不能重复产生副作用。

Phase 4 会把这些能力扩展为完整企业治理，但 Phase 3 不允许绕过最低安全边界。

### 2.5 Mock 与正式实现隔离

- Mock、Preview、fixture、demo data、fake service 必须与 production code 物理隔离。
- 正式页面、正式 Runtime 和正式 API client 不能 import mock 数据源。
- Mock 和真实实现只能共同依赖公开 contract types。
- Mock API 必须使用独立 namespace 或显式 preview/test 开关，生产部署默认关闭。
- 删除全部 Mock 后，正式页面、正式 API client 和真实 Runtime 不应需要修改。

### 2.6 模块化单体优先

MVP 保留完整架构边界，但不提前拆分完整平台服务。第一版工程形态收敛为：

```text
Control Plane 配置
Managed Runtime 核心
Governance 内部模块
Executor Adapter
```

## 3. 总体交付顺序

```text
Phase 0  Rebuild Baseline
  -> Phase 1  Workspace Shape + Semantic Contract Draft
  -> Phase 2  Mock Product Loop + Engineering Contract Freeze
  -> Phase 3  Real Runtime Vertical Slice
  -> Phase 4  Governed Write + First Employee Loop
  -> Phase 5  External Agent POC + Production Hardening
```

每个 Phase 只有一个主 Gate：

| Phase | 核心问题 |
| --- | --- |
| Phase 0 | 我们基于什么新基线继续开发？ |
| Phase 1 | 用户如何理解并参与一个任务？ |
| Phase 2 | 产品闭环和正式工程契约是否经过验证？ |
| Phase 3 | 真实 Runtime 能否安全完成最小任务纵向切片？ |
| Phase 4 | 第一个 Employee 能否完成受治理的真实业务闭环？ |
| Phase 5 | 外部 Agent Runtime 是否带来可证明的额外收益？ |

## 4. Phase 0：重构后基线重建

### 4.1 目标

重新建立架构、代码、数据和文档的共同起点，明确哪些旧资产保留、迁移、重写或删除。

Phase 0 不是单纯的文档整理。它必须消除会误导后续开发的旧阶段状态和隐式架构假设。

#### 本 Phase 参考文档

- `ARCHITECTURE_BASELINE.md`：主参考，确认系统层级、主权边界和禁止越权事项。
- `TASK_PRESENTATION_CONTRACT.md`：确认 Runtime 到 Workspace 的展示与交互语义边界。
- `RUNTIME_REMEDIATION_SPEC.md`：确认 Runtime 状态机、数据对象、治理和 Executor Adapter 边界。
- `WORKSPACE_VISUAL_BASELINE.md`：确认 Workspace 视觉和交互基线。
- `AI_EMPLOYEE_HARNESS_DESIGN.md`：辅助核对 Employee、Governance Harness 和 Executor 的职责关系。
- `TEMP_WORKSPACE_FIRST_REMEDIATION_PLAN.md`：仅作为历史参考，不作为新基线的实现权威。

### 4.2 工作范围

#### 文档权威

```text
ARCHITECTURE_BASELINE.md
  -> TASK_PRESENTATION_CONTRACT.md
  -> RUNTIME_REMEDIATION_SPEC.md
  -> WORKSPACE_VISUAL_BASELINE.md
  -> PHASED_ENGINEERING_DELIVERY_PLAN.md
```

领域边界：

- 架构层级、主权和禁止越权：`ARCHITECTURE_BASELINE.md`。
- Runtime 到 Workspace 的用户交互语义：`TASK_PRESENTATION_CONTRACT.md`。
- Runtime 状态机、数据对象、治理与 Executor Adapter：`RUNTIME_REMEDIATION_SPEC.md`。
- Workspace 视觉和交互边界：`WORKSPACE_VISUAL_BASELINE.md`。
- 阶段、依赖、交付物和 Gate：本文件。

#### 旧资产盘点

每个重构前资产必须归入以下一种状态：

```text
keep       可直接进入新基线
migrate    语义正确，但需要迁移到新边界
reference  只作为设计参考，不进入正式路径
delete     与新架构冲突或会误导开发
```

必须覆盖：

- Workspace 正式页面和 Preview 页面。
- 本地状态、fixture、mock client 和 demo data。
- API routes、schemas、数据库模型和迁移。
- shared package、类型和 API client。
- 启动脚本、README 和阶段常量。
- 历史架构与临时整改文档。

#### 新工程边界

至少确定：

- production / mock / preview / test 的目录边界。
- Workspace contract、API client 和组件依赖方向。
- Runtime module、Governance module 和 Executor Adapter 边界。
- 数据迁移策略与是否允许复用旧表。
- 新 Phase 的验收记录存放方式。

### 4.3 交付物

- 重构后 architecture baseline 已确认。
- 旧资产盘点清单及 keep/migrate/reference/delete 结论。
- 新目录与依赖边界说明。
- 新数据基线和迁移策略。
- 旧阶段标记清理清单。
- Phase 1 可直接执行的 backlog。

### 4.4 Gate 0 验收

- 文档之间不存在架构主权冲突。
- 所有重构前核心资产都有明确处置结论。
- 正式代码不会被旧 Mock、Preview 或阶段标记静默驱动。
- 团队能明确回答“当前真实入口、真实数据源和正式契约分别在哪里”。
- Phase 1 不再依赖尚未决定的架构问题。

### 4.5 禁止项

- 仅修改版本号或 Phase 文案就宣称完成 Phase 0。
- 未盘点旧资产便直接在旧实现上继续堆叠。
- 多份文档同时定义同一架构主权。
- 把重构前 Preview 当作新产品形态已经验收的证据。

## 5. Phase 1：Workspace 产品形态与语义契约草案

### 5.1 目标

确定普通用户如何发起、理解、参与和完成一个 Task，并根据真实交互样片形成 Presentation Contract 草案。

#### 本 Phase 参考文档

- `WORKSPACE_VISUAL_BASELINE.md`：主参考，约束 Workspace 产品形态、视觉和交互边界。
- `TASK_PRESENTATION_CONTRACT.md`：主参考，定义用户可见任务状态、Interaction 和 Result 语义。
- `ARCHITECTURE_BASELINE.md`：确认 Workspace 不消费 Runtime / Executor 内部对象和 trace。
- `WORKSPACE_MAIN_UI_COMPONENT_SPEC.md`：辅助指导现有 Workspace UI 的组件拆分和结构落实。

Workspace 主路径围绕：

```text
Task Composer
Active Task
Needs Attention
Result / History
```

必须覆盖的用户状态：

- 提交任务。
- 系统理解和处理任务。
- 补充上下文或文件。
- 选择或确认。
- 审批有风险的业务动作。
- 查看进度但不查看内部 trace。
- 从失败中恢复。
- 接收最终结果。

### 5.2 Presentation Contract 草案

Runtime 内部可以使用：

```text
TaskRequest
TaskDecision
RuntimeInvocation
InteractionRequest
InteractionResponse
TaskResult
```

Workspace 只消费：

```text
WorkspaceTaskView
TaskProgressView
InteractionView
ResultView
```

本阶段只冻结语义原则，不冻结最终字段：

- 用户可见状态及其含义。
- Interaction 的类别和用户动作。
- Result、失败和恢复的表达方式。
- Runtime 内部状态到用户状态的映射原则。
- 模型和 Executor 不得决定组件、布局、按钮或最终 UI 文案。

Workspace 组件只能消费 Presentation View Model。以下 Runtime DTO 或持久化对象不得直接作为 React component props、page state 或 client cache 的公开类型：

```text
TaskDecision
RuntimeInvocation
WorkflowRun
StepRun
ToolCall
ExecutorRun
ApprovalRequest
PermissionGrant
RuntimeAuditEvent
```

正式映射方向必须是：

```text
Runtime DTO / Runtime State
  -> Presentation Projector
  -> Workspace View Model
  -> Workspace Components
```

`Presentation Projector` 负责把内部状态、权限、审批和执行结果投影为稳定的用户语义；Workspace Components 不负责解释 Runtime 状态机。

### 5.3 产品样片

必须用一个完整 Customer Support 剧本覆盖：

```text
用户描述投诉
  -> AstraOS 解释理解结果
  -> 请求订单号或客户信息
  -> 用户补充信息
  -> 生成回复草稿
  -> 建议创建工单
  -> 展示审批和风险
  -> 用户批准或拒绝
  -> 展示成功、部分成功或失败结果
```

样片使用独立 Preview/fixture，不连接真实 Runtime，不进入正式 Workspace 数据源。

### 5.4 本阶段允许的前端改动

Phase 1 应开始修改前端，但修改范围限定在产品结构、组件边界和展示契约：

- 可以拆分 Task Composer、Task Timeline、Needs Attention、Interaction 和 Result 组件。
- 可以移除正式页面中内嵌的假状态、demo data 和临时 Runtime DTO。
- 可以建立正式 View Model 和 component props。
- 可以建立 Preview route 和隔离的 fixtures，用于验证完整产品样片。
- 可以调整正式 Workspace 的信息结构，使其符合 Task-first 产品形态。

本阶段不得：

- 实现真实 Workflow 或 Workflow routing。
- 接入 Hermes 或其他 External Agent Runtime。
- 接入产生真实副作用的 Tool。
- 提前实现真实 Runtime 状态机、持久化执行或恢复逻辑。
- 为了配合尚未实现的 Runtime 暴露内部对象到 Workspace。

### 5.5 Gate 1 验收

- 不查看 Console 或 Runtime trace，也能理解任务当前状态和下一步。
- 用户界面不围绕后端对象或内部枚举组织。
- 至少覆盖 completed、needs_context、needs_approval、failed 和 cancelled。
- Presentation Contract 草案能表达样片中的所有交互和恢复路径。
- Workspace 产品形态得到确认，但契约仍允许在 Phase 2 根据验证结果调整。

## 6. Phase 2：Mock 产品闭环验证与 Presentation Contract 冻结

### 6.1 目标

用最薄、可替换的 Mock Interaction Runtime 跑通端到端产品闭环，并在实际验证后冻结正式工程契约。

Phase 2 将原“Presentation Contract Freeze”和“API Contract + Shared Types”合并，避免在验证前后重复冻结。

#### 本 Phase 参考文档

- `TASK_PRESENTATION_CONTRACT.md`：主参考，定义并冻结 Presentation Contract Surface。
- `ARCHITECTURE_BASELINE.md`：确认 Presentation Boundary 与 Runtime 主权边界。
- `RUNTIME_REMEDIATION_SPEC.md`：确认 Runtime DTO、Interaction 和 TaskResult 的内部语义来源。
- `WORKSPACE_VISUAL_BASELINE.md`：核对 View Model 是否完整支持 Workspace 产品状态。
- `WORKSPACE_MAIN_UI_COMPONENT_SPEC.md`：辅助核对 Repository、View Model 与 Workspace Components 的落地边界。

### 6.2 Mock Interaction Runtime

必须支持：

- submit task。
- provide context / upload reference。
- approve / reject。
- get task view。
- get result。
- failed / retry / alternative action。

Mock 行为必须：

- 位于明确的 mock module。
- 不写真实 Runtime 表。
- 不注册真实 Executor 或产生真实副作用。
- 不被 production code 反向依赖。
- 可在关闭开关后完全从生产 API 消失。

### 6.3 正式工程契约

本阶段冻结：

- OpenAPI。
- Pydantic schemas。
- TypeScript View Model types。
- Presentation View Model 属于正式 Contract Surface，而不是仅供前端内部使用的 React 类型。
- View Model 的字段名称、状态语义、可空性和兼容规则必须由 OpenAPI、Pydantic schema 和 TypeScript types 共同约束。
- 新增可选字段可以保持向后兼容；删除字段、重命名字段、改变字段含义或收窄允许值属于破坏性变更，必须显式版本化或提供迁移方案。
- 前端不得通过猜测、默认值或解析 Runtime 内部枚举来补全 Contract 未表达的业务语义。
- Interaction response 写回协议。
- error envelope 和恢复语义。
- `WorkspaceTaskRepository` Interface，以及 Mock / API Repository 的共同契约。
- API contract tests。

### 6.4 Repository / Data Provider 边界

Workspace 的可复用页面表面和组件不能直接依赖 `fetch`、API SDK、mock client、fixture 或 Runtime DTO。它们只能依赖稳定的 Repository Interface：

```text
Workspace Route / Composition Root
  -> WorkspaceTaskRepository Interface
       -> ApiWorkspaceTaskRepository
       -> MockWorkspaceTaskRepository
  -> Workspace View Model
  -> Workspace Components
```

Repository Interface 至少负责：

- submit task。
- load workspace task view。
- load task result。
- submit interaction response。
- retry、cancel 或恢复等已进入正式契约的用户动作。

依赖规则：

- Workspace Components 和可复用 Workspace Surface 只能依赖 Repository Interface 与 View Model types。
- Production composition root 只能装配 `ApiWorkspaceTaskRepository`。
- Preview/test composition root 可以显式装配 `MockWorkspaceTaskRepository`。
- `MockWorkspaceTaskRepository` 必须位于 mock/preview/test 专用目录。
- 禁止在 Workspace 页面或组件中使用 `if (isMock)`、环境变量分支或动态 import 来选择数据源。
- 禁止 Workspace 页面和组件直接 import fixture、mock data 或 Runtime API DTO。
- 数据源选择只能发生在明确的 composition root；不得渗透到业务组件。
- Mock Repository 和 API Repository 必须通过同一套 contract tests。

推荐目录边界：

```text
apps/web/src/features/workspace/
  components/
  contract/
  repositories/
    workspace-task-repository.ts
    api-workspace-task-repository.ts
  presentation/

apps/web/src/mock/
  repositories/
    mock-workspace-task-repository.ts
  fixtures/
  scenarios/
```

### 6.5 Presentation Projector 边界

后端必须在 API 边界之前完成 Runtime DTO 到 Workspace View Model 的投影：

```text
Runtime State / Runtime DTO
  -> Presentation Projector
  -> API Response View Model
  -> WorkspaceTaskRepository
  -> Workspace Components
```

Presentation Projector 属于后端 Application Layer，是 Runtime 状态进入普通用户产品界面的唯一正式投影位置。

职责边界：

- Runtime 和 Executor 只产生内部状态、事件和结果，不直接构造 Workspace API Response。
- Presentation Projector 负责将 Runtime 状态、Interaction、权限、审批、进度和结果转换为正式 Presentation View Model。
- API endpoint 只能序列化 Projector 已生成的 View Model，不得在 controller 或 route 中再次解释 Runtime 状态。
- `ApiWorkspaceTaskRepository` 只负责请求、错误转换和 View Model 交付，不得再次执行状态映射或业务语义投影。
- Workspace 页面和组件不得重复实现与 Projector 相同的状态转换逻辑。
- 同一个 Runtime 状态到用户语义的映射必须只有一个后端权威实现，禁止在 Runtime、API route、Repository 和 React 组件中分别维护多套 `switch status`。

工程约束：

- OpenAPI 的 Workspace endpoints 只能返回 Presentation View Model。
- API Repository 不得把 Runtime DTO 原样传入前端组件。
- Workspace Components 不得消费 `TaskDecision`、`RuntimeInvocation`、`WorkflowRun`、`ToolCall`、`ExecutorRun` 或 `ApprovalRequest`。
- Approval 在 Runtime 内部可以是治理对象，但进入 Workspace 前必须投影为 `InteractionView`。
- Runtime 状态枚举变化不应直接导致 React component props 发生破坏性变化。
- Projector mapping 必须有覆盖等待、审批、失败、取消、部分成功和恢复路径的自动测试。

建议主路径：

```text
GET  /api/workspaces/{workspace_id}/task-view
POST /api/workspaces/{workspace_id}/tasks
POST /api/tasks/{task_id}/interactions/{interaction_id}/responses
GET  /api/tasks/{task_id}
GET  /api/tasks/{task_id}/result
```

OpenAPI 不暴露 `RuntimeInvocation`、`ToolCall`、`WorkflowRun`、`StepRun` 或原始 Executor event。

### 6.6 Gate 2 验收

- 不接 LLM 和真实 Tool 也能完成整个 Customer Support 样片。
- Mock Repository 和 API Repository 编译期返回同一套 View Model，并通过同一套 contract tests。
- TypeScript、Pydantic 和 OpenAPI 通过自动 contract tests 验证一致性。
- 正式 Workspace 不 import mock。
- Workspace 页面和组件中不存在 `if (isMock)` 或等价的数据源选择逻辑。
- Workspace Components 的公开 props 和 state 不包含 Runtime DTO。
- Presentation Projector 的状态映射测试覆盖主要任务、Interaction、结果和恢复路径。
- 删除 Mock 后，正式组件、类型和 API client 不需要重写。
- 从本 Gate 起，契约破坏性变更必须显式版本化或提供迁移方案。

## 7. Phase 3：真实 Runtime 最小纵向切片

### 7.1 目标

用真实持久化 Runtime 替换 Mock 主路径，完成 Direct Answer、Clarification 和只读 Tool 的最小纵向切片，同时落实不可绕过的最低安全边界。

#### 本 Phase 参考文档

- `RUNTIME_REMEDIATION_SPEC.md`：主参考，定义 Runtime 状态机、持久化对象、Interaction Runtime、Executor Adapter 和最低治理要求。
- `ARCHITECTURE_BASELINE.md`：确认 Managed Runtime、Governance 和 Executor Layer 的主权边界。
- `TASK_PRESENTATION_CONTRACT.md`：确认真实 Runtime 输出仍通过 Presentation Projector 映射为既有 View Model。
- `AI_EMPLOYEE_HARNESS_DESIGN.md`：辅助核对 Direct Model、ToolActionExecutor 和 Runtime Harness 的职责划分。

真实主链路：

```text
Task Intake
  -> TaskDecision
  -> RuntimeInvocation
  -> Runtime Adapter
  -> Executor Backend
  <-> ExecutorEvent / Interaction Intent / Result Fragment
  <-> Interaction Runtime
  -> TaskResult
```

### 7.2 优先 Executor

```text
DirectAnswerExecutor
ClarificationExecutor
ReadOnlyToolExecutor / ToolActionExecutor(read-only)
```

ExternalAgentExecutor 和 WorkflowExecutor 只定义稳定接口，不接入 production 主路径。

### 7.3 数据与恢复

必须持久化：

- TaskRequest。
- TaskDecision；允许补充信息或执行结果触发重新决策。
- RuntimeInvocation / ExecutorRun。
- InteractionRequest / InteractionResponse。
- TaskResult。
- 最小 RuntimeAuditEvent。

必须支持：

- 缺信息时暂停。
- 用户补充后恢复。
- 进程重启后读取并继续等待中的 Task。
- Executor 失败后生成可解释结果。
- 相同 InteractionResponse 不被重复消费。

### 7.4 最低治理要求

- Tool 必须注册、校验 schema 并声明 side-effect level。
- 默认禁止 write 和 external side effect。
- 每次 Tool operation 都有 operation identity 和基础审计记录。
- Runtime Adapter 是所有 Executor 的唯一正式入口。
- 任何 Executor 都不能直接把内部 trace 暴露给 Workspace。

### 7.5 Gate 3 验收

- 真实 Runtime 可以替换 Mock，Workspace 不重做。
- 简单问答不创建 Workflow。
- 缺信息任务能跨请求、跨进程暂停和恢复。
- 至少一个真实只读 Tool 能安全执行并生成 TaskResult。
- 未批准的写操作在架构上不可执行，而非仅靠 UI 隐藏。
- 审计能够解释 Task 的决策、暂停、恢复和只读 Tool 执行。

## 8. Phase 4：受治理写操作与第一个 Employee 闭环

### 8.1 目标

在真实 Customer Support 场景中完成第一个受治理业务闭环，证明 AI Employee 是业务责任和治理对象，而不是新的 Agent loop。

#### 本 Phase 参考文档

- `AI_EMPLOYEE_HARNESS_DESIGN.md`：主参考，定义 AI Employee、Employee Package、Execution Profile 和 Harness 职责。
- `RUNTIME_REMEDIATION_SPEC.md`：主参考，定义 Permission、Approval、Idempotency、Audit、恢复和 Tool 执行控制。
- `ARCHITECTURE_BASELINE.md`：确认 Employee、Managed Runtime、Governance Harness Services 和 Executor 的系统边界。
- `TASK_PRESENTATION_CONTRACT.md`：确认审批、失败、恢复和 TaskResult 的用户呈现语义。

业务闭环：

```text
用户描述客户问题
  -> 检索知识或订单信息
  -> 直接回答或追问
  -> 生成客户回复草稿
  -> 建议创建支持工单
  -> 用户审批
  -> Tool 幂等创建工单
  -> 返回 TaskResult
```

### 8.2 完整治理

本阶段实现：

- Permission 和 resource scope。
- Approval、reject、expire。
- Idempotency。
- Retry 和 timeout。
- Pause / resume。
- 完整 Audit。
- 失败 reconciliation；必要时定义 compensation。
- Human takeover 的最小入口。

安全要求：

- 审批前不能写业务表或产生外部副作用。
- 重复批准、网络重试和 Runtime 重启不能重复创建业务对象。
- Approval 必须描述具体业务动作、资源和风险。
- Employee、Direct Model 和 Tool 都不能绕过 Governance 边界。

### 8.3 Employee Package

第一个 Employee 建议为：

```text
Customer Support Employee
```

Employee Package 至少定义：

- business identity。
- capabilities 和 intent examples。
- knowledge scope。
- allowed tool contract。
- default policy。
- execution profile。
- outcome contract。
- version。

本阶段允许的逻辑 Executor 选择：

```text
direct_model_runtime
human_executor
```

`tool_action` 是由 `ToolActionExecutor` 承接的单次受治理调用类型，不是与 Direct Model Runtime、Workflow Runtime、Agent Runtime 或 Human Executor 并列的逻辑 Executor。`agent_runtime` 可以保留在 Execution Profile schema 中，但在 Phase 5 验证前不作为生产默认路径。

### 8.4 Gate 4 验收

- 用户能完成一个真实 Customer Support 任务闭环。
- 工单等写操作必须审批且具备幂等保证。
- approve、reject、expire、retry 和进程恢复都有自动测试。
- Audit 能解释决策、权限、审批、执行、副作用和结果。
- Employee 没有复制 Agent loop，也没有绕过 Managed Runtime。
- 有可记录的业务基线：成功率、人工介入率、恢复率、时延和成本。

## 9. Phase 5：External Agent Runtime POC 与生产加固

### 9.1 目标

基于 Phase 4 的真实业务基线，验证 Hermes 等 External Agent Runtime 是否能在受控边界内提升复杂任务完成率，并判断收益是否覆盖额外成本和风险。

Phase 5 不以“成功接通 Hermes API”为完成标准，而以可对照的业务收益为完成标准。

#### 本 Phase 参考文档

- `ARCHITECTURE_BASELINE.md`：主参考，定义 External Agent Runtime 在 AstraOS 中的架构位置和主权限制。
- `RUNTIME_REMEDIATION_SPEC.md`：主参考，定义 ExternalAgentExecutor、ExecutorRequest/Event/Result/Control 和治理接入边界。
- `AI_EMPLOYEE_HARNESS_DESIGN.md`：主参考，定义 Hermes Harness、Employee Execution Profile 和 Direct Agent 对照关系。
- `TASK_PRESENTATION_CONTRACT.md`：确认 External Agent 事件不能直接进入 Workspace，仍须投影为正式 View Model。

### 9.2 架构边界

```text
TaskRequest
  -> TaskDecision
  -> RuntimeInvocation(invocation_type = external_agent)
  -> Runtime Adapter
  -> ExternalAgentExecutor
  -> Hermes Adapter
  <-> ExecutorEvent / ToolRequest / Interaction Intent / ExecutorResult
  <-> Tool Gateway / Permission / Approval / Audit
  -> TaskResult
```

边界要求：

- Hermes 是可替换 Executor Backend，不拥有 AstraOS Task 主权。
- Hermes 接受 `ExecutorRequest`，不直接接收未经治理的原始 Workspace session。
- Hermes 的 ToolRequest 必须经过 AstraOS Tool Gateway。
- `ExecutorResult` 是候选执行结果，最终 `TaskResult` 由 AstraOS Managed Runtime 产生。
- 外部 Runtime 不能绕过 Permission、Approval、Idempotency、Audit 和 Interaction Runtime。

### 9.3 对照评估

使用 Phase 4 的 Customer Support 场景比较：

```text
Employee + Direct Model / Tool Runtime
Direct External Agent
Employee + External Agent Runtime
```

至少评估：

- task success rate。
- executor selection accuracy。
- approval correctness。
- unsafe tool request interception rate。
- recovery success rate。
- human takeover rate。
- average / p95 latency。
- token cost 和 total cost。
- 结果质量和 outcome evidence 完整度。

### 9.4 生产加固

- Executor heartbeat、cancel、pause 和 resume。
- 事件去重、乱序处理和断线恢复。
- 版本、backend 和 capability 审计。
- 敏感上下文最小化和脱敏。
- 限流、配额和成本保护。
- 可观测性、告警和回归评估。
- External Agent feature flag 和可回退路径。

### 9.5 Gate 5 验收

- External Agent Runtime 可以作为受控 Executor 接入和移除。
- 外部 Runtime 中断后，Task 状态仍由 AstraOS 恢复或解释。
- 已完成三组路径的对照评估。
- 只有收益达到预设阈值的任务类型才启用 external agent routing。
- External Agent 不会把 AstraOS 退化为 Hermes 包装层。
- Customer Support Employee 在生产候选配置下仍满足 Phase 4 的治理不变量。

## 10. 总体验收矩阵

| Phase | 核心验收 | 不能出现 |
| --- | --- | --- |
| Phase 0 | 重构后架构、代码、数据和文档基线明确 | 旧 Phase 标记被当成新进度 |
| Phase 1 | Workspace 产品形态和语义契约草案覆盖完整任务体验 | Runtime 对象成为普通用户 UI |
| Phase 2 | Mock 产品闭环完成，Presentation Boundary（Repository、Projector、View Model、OpenAPI）正式冻结 | 未验证便冻结、production import mock 或组件消费 Runtime DTO |
| Phase 3 | 真实 Runtime 完成问答、追问、恢复和只读 Tool 纵向切片 | 无 operation identity、无审计或可执行写操作 |
| Phase 4 | Customer Support Employee 完成受治理写操作闭环 | 审批前副作用、重复写入或 Employee 复制 Agent loop |
| Phase 5 | External Agent 在真实业务基线上证明额外收益并完成生产加固 | Hermes 绕过 Managed Runtime 或 Governance |

## 11. Milestones

```text
Milestone A：Rebuilt Baseline
  Gate 0 accepted。

Milestone B：Product and Semantic Shape
  Gate 1 accepted。

Milestone C：Validated Contract
  Gate 2 accepted。

Milestone D：Runtime Vertical Slice
  Gate 3 accepted。

Milestone E：First Governed Employee
  Gate 4 accepted。

Milestone F：External Agent Production Candidate
  Gate 5 accepted。
```

## 12. Gate 验收记录要求

每次 Phase 验收必须记录：

- 验收日期和对应 commit。
- Gate 中每一项的证据链接。
- 自动测试、演示场景和已知限制。
- 未完成项是否阻塞下一 Phase。
- 对架构、契约和数据迁移的影响。
- 验收结论：accepted / rejected / superseded。

未形成验收记录时，Phase 不能更新为 `accepted`。

## 13. 文档维护要求

- Phase 状态或交付顺序变化时，优先更新本文件。
- 主架构变化时，同步更新 `ARCHITECTURE_BASELINE.md`。
- 用户交互语义变化时，同步更新 `TASK_PRESENTATION_CONTRACT.md`。
- Runtime 对象、状态机或治理不变量变化时，同步更新 `RUNTIME_REMEDIATION_SPEC.md`。
- Workspace 产品形态变化时，同步更新 `WORKSPACE_VISUAL_BASELINE.md`。
- External Agent 边界变化时，同步更新主架构和 Runtime 规格。
- 新增 UI 状态必须说明用户文案方向、Runtime 映射和失败恢复路径。
- 新增后端对象必须说明是否允许进入普通用户界面；默认不允许。
