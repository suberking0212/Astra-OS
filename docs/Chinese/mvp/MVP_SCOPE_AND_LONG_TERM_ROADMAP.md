# AstraOS MVP 实施范围与长期规划

更新时间：2026-07-16

本文档是 AstraOS “何时实现、实现到什么程度”的唯一范围权威。它不重新定义系统架构、Runtime 契约或 Workspace 语义；它负责把这些设计映射到当前基线、MVP Phase 和长期规划。

当其他文档描述了某个对象、模块或流程，但没有声明实现时间时，必须以本文档的范围标记为准。架构图中出现某项能力，不代表该能力已经实现，也不代表它属于当前 Phase。

## 1. MVP 定义与退出条件

AstraOS 产品 MVP 的目标是验证 AI Employee 的完整业务闭环：

```text
用户委托 Task
  -> 系统理解或追问
  -> 受控执行
  -> 必要时请求用户审批
  -> 幂等地产生业务结果
  -> 交付可解释 TaskResult
```

MVP Exit 固定为：

```text
Gate 4 accepted
```

Phase 5 的 External Agent Runtime / Hermes POC 与生产加固属于 MVP 后验证，不是产品 MVP 上线的前置条件。只有真实业务基线证明 External Agent 能带来额外收益时，才进入对应生产路径。

## 2. 统一实施状态标记

所有活跃设计文档使用以下标记：

| 标记 | 含义 |
| --- | --- |
| `[CURRENT]` | 当前正式 production 路径已经实现并有代码或数据证据。 |
| `[MVP-P1]` | Phase 1 实现产品形态和语义草案，不连接真实 Runtime。 |
| `[MVP-P2]` | Phase 2 用隔离 Mock 验证闭环并冻结公开工程契约。 |
| `[MVP-P3]` | Phase 3 实现真实持久化 Runtime、追问恢复和只读 Tool 纵向切片。 |
| `[MVP-P4]` | Phase 4 实现第一个受治理写操作与 Customer Support Employee 闭环。 |
| `[MVP-CONTRACT]` | MVP 内只保留架构边界、语义、接口、枚举或禁用适配器，不实现完整业务流程。 |
| `[POST-MVP-P5]` | Gate 4 后进入 Phase 5 的验证或生产加固。 |
| `[DEFERRED]` | 长期方向已知，但没有进入当前 Phase 排期；需要真实客户需求重新立项。 |
| `[PROHIBITED]` | 明确不建设，或不得以该方式实现。 |

“定义了类型或对象”只能证明设计存在；只有 `[CURRENT]` 或对应 Phase Gate accepted 才能证明功能已经实现。

## 3. 当前真实实现

当前 production 基线为 `[CURRENT]`：

- 注册、登录、邮箱验证和 JWT Session。
- owner-scoped Workspace 创建、列表和详情；数据库实体仍命名为 `projects`。
- PostgreSQL 中的 `users`、`email_verification_codes`、`projects`。
- 正式 Workspace 只读取 Auth / Project API，并明确显示 Task capability unavailable。
- Preview 与 production 数据源隔离，默认关闭。
- 文档、工程和 Mock 边界自动检查。

当前尚未正式实现：

- Task 提交、Task 状态机和 TaskResult。
- Interaction 持久化、Approval、Pause / Resume。
- ToolDefinition、Tool Gateway、真实 Tool 执行和 Idempotency。
- AI Employee、HumanExecutor、WorkflowExecutor、ExternalAgentExecutor。
- Organization、Membership、Assignment Queue 或多人协作。

## 4. MVP 必须实现

### 4.1 `[MVP-P1]` Workspace 产品形态与语义草案

- Task Composer、Active Task、Needs Attention、Result / History 的产品结构。
- `WorkspaceTaskView`、`TaskProgressView`、`InteractionView`、`ResultView` 语义草案。
- Customer Support 隔离 Preview，覆盖 context、approval、result、failure 和 cancellation。
- Workspace 不暴露 Runtime / Executor 内部对象和 trace。

Phase 1 不实现真实 Task API、Runtime、Tool、Approval 或副作用。

### 4.2 `[MVP-P2]` Mock 闭环与公开契约冻结

- Mock Interaction Runtime 和 `WorkspaceTaskRepository`。
- submit、provide context、approve / reject、retry / cancel、result 的完整 Mock 闭环。
- Presentation Projector 边界。
- OpenAPI、Pydantic、TypeScript View Model 与 contract tests。
- Production 与 Mock composition root 物理隔离。

Phase 2 的 Approval 仍是 Mock 产品行为，不代表 Governance 已真实实现。

### 4.3 `[MVP-P3]` 真实 Runtime 最小纵向切片

- TaskRequest、TaskDecision、RuntimeInvocation、TaskResult 的真实持久语义。
- InteractionRequest / InteractionResponse、暂停、补充信息和恢复。
- DirectAnswerExecutor、ClarificationExecutor、只读 ToolActionExecutor。
- Tool 注册、schema 校验、side-effect 分类和 operation identity。
- 默认拒绝 write / external Tool。
- 最小 RuntimeAuditEvent。
- 进程重启后仍能读取等待中的 Task，相同 InteractionResponse 不重复消费。

逻辑对象不要求一对象一表；可以在模块化单体内使用最小持久化结构，只要状态、幂等和审计不变量成立。

### 4.4 `[MVP-P4]` 第一个受治理 Employee 闭环

- Customer Support Employee Package 的最小版本。
- Knowledge / order 等只读能力。
- 客户回复草稿和支持工单建议。
- 单级 Approval：approve、reject、expire。
- 单个明确写 Tool 的 Permission、resource scope、Idempotency、retry、timeout 和结果验证。
- 场景级 reconciliation；只在确有部分副作用时定义对应 compensation。
- 覆盖决策、审批、Tool 操作、副作用和 TaskResult 的闭环 Audit。
- 成功率、恢复率、人工介入率、时延和成本基线。

MVP 的“完整治理”只表示第一个业务闭环的治理链路完整，不表示已经建成通用企业治理平台。

## 5. MVP 只保留设计与预设

以下能力属于 `[MVP-CONTRACT]`：

### 5.1 HumanExecutor

MVP 保留：

- HumanExecutor 是正式逻辑 Executor。
- `RuntimeInvocation(invocation_type = "human")` 的语义。
- Direct Human Routing、Human Takeover 与 Approval 的主权区分。
- HumanExecutor Adapter / Human Work Item 的最小接口边界。
- 所需人工能力、允许动作、可见上下文、outcome spec 和结果回收的概念字段。

MVP 不实现：

- 真实团队成员分派、认领、拒绝、转派和抢占。
- Assignment Queue / Human Work Inbox 产品。
- 值班、SLA、升级、负载均衡和多人并发处理。
- 人工执行的生产主路径和通用结果回收流程。

如果首个付费或试点客户明确要求人工实际执行，可通过独立范围变更把最小 Human Work 流程提前，但不能仅因为架构图中存在 HumanExecutor 就进入 Gate 4 必选范围。

### 5.2 Team / Organization / Authorization

MVP 保留：

- 所有新 Task、Interaction、Approval、Audit 和业务对象引用必须带 `workspace_id`。
- 明确区分 creator、actor、approver、assignee，不使用含义不清的统一 `user_id`。
- 授权通过统一策略接口判断；MVP 实现可以是 owner-only。
- 状态变更保留幂等、唯一约束或乐观并发控制能力。

MVP 不实现 Organization、Membership、Invitation、团队角色管理、完整 RBAC 或 ABAC。

### 5.3 Executor 与 Workflow 扩展点

- WorkflowExecutor：保留接口和 invocation taxonomy，不进入 MVP production 主路径。
- ExternalAgentExecutor：保留 ExecutorRequest / Event / Result / Control 与 capability contract，不在 Gate 4 前接入 production。
- 多 Executor 智能路由：保留 TaskDecision / Execution Profile 的语义，不实现动态负载路由平台。

### 5.4 Queue 与恢复扩展点

- Infrastructure Job Queue 是可选 Foundation 能力。
- MVP 先使用数据库持久状态和受控调度满足等待、恢复、幂等和审计。
- 不部署分布式事件总线或通用队列平台。
- “Support follow-up item”“Human Work Inbox”和“Infrastructure Job Queue”必须使用不同术语，禁止混称为 Queue。

## 6. MVP 后实现

### 6.1 `[POST-MVP-P5]` External Agent POC 与生产加固

- Hermes / ExternalAgentExecutor 受控接入。
- 与 Direct Model / Tool 路径进行业务效果对照。
- heartbeat、cancel、pause、resume、事件去重、乱序和断线恢复。
- 版本、capability、成本、限流、告警和回退路径。
- 只对收益超过预设阈值的任务启用 external agent routing。

### 6.2 `[DEFERRED]` 小团队与企业协作

- Organization、Workspace Membership、Invitation。
- Workspace roles、团队级 RBAC，必要时再演进到 ABAC。
- Human Work Item、Assignment Inbox、claim / reassign / delegate。
- 多级审批、会签、审批委托、审批人组和升级链。
- 多人实时协作、评论、通知、值班和 SLA。
- 团队审计查询、导出、保留策略和 SIEM 集成。

### 6.3 `[DEFERRED]` 平台化能力

- 独立 Governance 微服务群。
- 分布式事件总线和复杂 Checkpoint / Recovery 平台。
- 通用 Workflow Builder 和 Workflow Marketplace。
- 多 Executor 智能负载路由。
- Billing、配额结算和完整 Marketplace 生命周期。
- 通用 reconciliation / compensation 引擎。

这些能力只有在业务量、团队协作或合规要求形成真实证据后才立项。

## 7. 能力实施矩阵

| 能力 | MVP 状态 | 目标时间 | MVP 交付深度 |
| --- | --- | --- | --- |
| Auth / Workspace ownership | `[CURRENT]` | 已实现 | owner-scoped production 能力 |
| Workspace 产品结构 | `[MVP-P1]` | Gate 1 | 语义草案与隔离 Preview |
| Presentation Contract | `[MVP-P2]` | Gate 2 | OpenAPI / Pydantic / TS 冻结 |
| Mock Interaction Runtime | `[MVP-P2]` | Gate 2 | 完整产品闭环，无真实副作用 |
| Task / Interaction 持久 Runtime | `[MVP-P3]` | Gate 3 | 问答、追问、恢复、只读 Tool |
| ToolDefinition / 最低治理 | `[MVP-P3]` | Gate 3 | 注册、schema、分类、默认拒绝写 |
| 单级 Approval / Idempotent Write | `[MVP-P4]` | Gate 4 | 一个 Customer Support 写操作闭环 |
| Customer Support Employee | `[MVP-P4]` | Gate 4 | 最小 Employee Package 与业务基线 |
| HumanExecutor 语义与 Adapter | `[MVP-CONTRACT]` | Gate 4 前保持设计一致 | 不接 production 人工分派主路径 |
| Assignment Queue / Human Work Inbox | `[DEFERRED]` | 客户需求触发 | 不实现 |
| Organization / Membership | `[DEFERRED]` | 小团队版本 | 不实现，仅保留 workspace scope |
| 多级 Approval / 完整 RBAC / ABAC | `[DEFERRED]` | 企业治理版本 | 不实现 |
| Infrastructure Job Queue | `[MVP-CONTRACT]` | 规模需要时 | 当前不部署，数据库状态优先 |
| ExternalAgentExecutor / Hermes | `[POST-MVP-P5]` | Gate 5 | 基于 Gate 4 业务基线进行 POC |
| WorkflowExecutor / Builder | `[DEFERRED]` | 确定性多步场景触发 | 仅保留接口；Builder 不实现 |
| Billing / Marketplace | `[DEFERRED]` | 商业化阶段 | 不实现 |

## 8. 文档范围映射

| 文档 | 负责什么 | 如何解释实现范围 |
| --- | --- | --- |
| `ARCHITECTURE_BASELINE.md` | 长期系统边界和禁止事项 | 架构存在不等于 MVP 已实现；以本文档矩阵为准 |
| `TASK_PRESENTATION_CONTRACT.md` | Runtime 到 Workspace 的展示契约 | Phase 1 草拟，Phase 2 冻结；扩展 Interaction kind 可只保留语义 |
| `RUNTIME_REMEDIATION_SPEC.md` | Runtime 对象、状态机与治理工程规格 | Phase 3/4 只实现最小纵向子集，其他对象保留 contract |
| `WORKSPACE_VISUAL_BASELINE.md` | Workspace 视觉与交互边界 | Phase 1/2 落地 MVP 必需状态，长期 renderer 按需增加 |
| `PHASED_ENGINEERING_DELIVERY_PLAN.md` | Phase、Gate 和交付顺序 | Gate 4 是 MVP Exit；Phase 5 是 Post-MVP |
| `AI_EMPLOYEE_HARNESS_DESIGN.md` | Employee / Harness / Executor 辅助设计 | Sequence A-E 映射 MVP；其中 HumanExecutor 仅 contract；Sequence F 属于 Post-MVP |
| `REBUILT_ENGINEERING_BASELINE.md` | 当前已实现工程和数据事实 | 只证明 `[CURRENT]`，不证明后续设计已实现 |
| `WORKSPACE_MAIN_UI_COMPONENT_SPEC.md` | Phase 1/2 UI 拆分辅助规范 | 不证明 Runtime、Approval 或 Tool 已存在 |

## 9. 变更规则

- 新能力进入 MVP 前，必须说明它验证的业务假设、目标 Phase、Gate、最小交付深度和明确非目标。
- `[MVP-CONTRACT]` 升级为 `[MVP-P3]` 或 `[MVP-P4]` 时，必须同步更新本文件和阶段计划。
- `[DEFERRED]` 能力不得仅凭架构图、类型定义、Preview 或接口占位进入开发 backlog。
- Preview、Mock、文档、枚举和禁用 Adapter 不构成实现完成证据。
- 每个 Gate 仍必须以绑定 commit 的验收记录和自动测试作为实现证据。
