# AstraOS 重构后工程基线

更新时间：2026-07-16

本文档落实 `PHASED_ENGINEERING_DELIVERY_PLAN.md` 的 Phase 0。它记录当前真实入口、真实数据源、工程边界、旧资产处置、数据迁移策略和 Phase 1 backlog，但不替代任何上位权威文档。

范围说明：本文档中的“当前真实基线”统一标记为 `[CURRENT]`；Phase 1 backlog 标记为 `[MVP-P1]`。其余 MVP、Post-MVP 和 Deferred 能力以 `MVP_SCOPE_AND_LONG_TERM_ROADMAP.md` 为准。本文件未列出的长期对象不代表被否定，也不代表已经实现。

## 1. 文档权威与冲突处理

权威顺序固定为：

```text
ARCHITECTURE_BASELINE.md
  -> MVP_SCOPE_AND_LONG_TERM_ROADMAP.md
  -> TASK_PRESENTATION_CONTRACT.md
  -> RUNTIME_REMEDIATION_SPEC.md
  -> WORKSPACE_VISUAL_BASELINE.md
  -> PHASED_ENGINEERING_DELIVERY_PLAN.md
```

分工如下：

| 问题 | 唯一权威 |
| --- | --- |
| 系统层级、主权、禁止越权 | `ARCHITECTURE_BASELINE.md` |
| 当前、MVP、Post-MVP、Deferred 实施范围 | `MVP_SCOPE_AND_LONG_TERM_ROADMAP.md` |
| Runtime 到 Workspace 的用户语义 | `TASK_PRESENTATION_CONTRACT.md` |
| Runtime 状态机、对象、治理、Executor Adapter | `RUNTIME_REMEDIATION_SPEC.md` |
| Workspace 视觉与交互边界 | `WORKSPACE_VISUAL_BASELINE.md` |
| 阶段、依赖、Gate、状态 | `PHASED_ENGINEERING_DELIVERY_PLAN.md` |

`AI_EMPLOYEE_HARNESS_DESIGN.md` 是 Employee、Governance Harness 和 Executor 关系的辅助设计；其中 Sequence A-F 只表示设计内部实现顺序，不表示项目 Phase 状态。`TEMP_WORKSPACE_FIRST_REMEDIATION_PLAN.md` 是历史参考，若与上述权威文档冲突，始终以上述权威文档为准。

核对结论：权威文档在以下主权上保持一致：Workspace 只消费 Presentation View Model；Managed Runtime 持有 Task、Interaction、恢复、Direct Human Routing、Human Takeover 与 TaskResult 主权；Governance Harness Services 持有执行边界和 Approval 主权；Executor 负责实际执行；HumanExecutor 既可由 TaskDecision 直接选择，也可由运行中重新决策选择；人工只批准原 Executor 动作时不构成 HumanExecutor；Hermes 只是可替换 External Agent Executor Backend；Tool 只能通过 Tool Gateway 受治理调用。

## 2. `[CURRENT]` 当前真实基线

| 类别 | 当前真实位置 | 说明 |
| --- | --- | --- |
| Web 入口 | `apps/web/src/app` | Next.js App Router；正式入口为 `/login`、`/verify-email`、`/workspace` |
| 正式 Workspace | `apps/web/src/components/workspace/workspace-detail.tsx` | 只读取 Auth API，并渲染单一 Workspace shell；没有 Task、Runtime 或本地 demo 数据源 |
| 正式 Web 数据源 | `apps/web/src/lib/api-client.ts` | `NEXT_PUBLIC_API_BASE_URL` 指向 FastAPI；没有 mock 选择分支 |
| Preview | `apps/web/src/app/(workspace)/workspace/phase1-preview` | 只引用 `apps/web/src/mock`；`ENABLE_WORKSPACE_PREVIEWS=true` 时才可访问，默认 404 |
| API 入口 | `services/api/app/main.py` | FastAPI；当前仅挂载 Auth 和 Health |
| 正式 API 业务模块 | `services/api/app/modules/auth` | 认证与邮箱验证 |
| 正式数据库模型 | `services/api/app/db/models.py` | `users`、`email_verification_codes` |
| 数据迁移 | `services/api/alembic/versions/20260714_0001_rebuild_auth_workspace_baseline.py`、`20260716_0002_remove_projects_workspace_container.py` | 新基线首个 Alembic revision 建立 Auth 基线；后续 revision 删除脱节的 `projects` 容器表 |
| Shared package | `packages/shared` | 承载冻结的 `workspace-presentation-v1` 公开类型；不得存放 Phase 状态或 Runtime DTO |
| 本地启动 | `scripts/dev.sh` | 启动 PostgreSQL 与 Qdrant、执行 Alembic、启动 FastAPI 与 Next.js；只公布真实存在的入口 |
| Phase 状态 | `PHASED_ENGINEERING_DELIVERY_PLAN.md` 第 1 节 | 唯一阶段状态来源 |

明确回答：当前真实入口是 Workspace 路由、FastAPI Auth 路由和默认关闭的 Phase 2 Workspace Mock API；真实持久化数据源仍只有 PostgreSQL 中的 `users`、`email_verification_codes` 表。Task 数据只存在于隔离内存 Mock Runtime，不写数据库；正式 Presentation API 契约已冻结为 `workspace-presentation-v1`，由 OpenAPI/Pydantic/TypeScript 共同约束。

## 3. 目录与依赖边界

目标边界：

```text
apps/web/src/app + components + features
  -> apps/web/src/lib/api-client.ts
  -> Presentation View Model contract（Phase 1/2 建立）

apps/web/src/mock
  -> 只允许被 preview/test composition root 引用

services/api/app/api/routes
  -> application modules
  -> presentation projector（Phase 2 建立）
  -> managed runtime / governance / executor adapters（Phase 3 起建立）

packages/shared
  -> 只承载经过验证的公开跨应用 contract
```

强制规则：

- 正式 Web 页面和组件不得 import `apps/web/src/mock`、fixture 或 demo data。
- Preview/test 可以依赖 mock，但必须位于专用目录和显式 composition root。
- Preview 在生产配置中默认关闭，不得被导航或正式 API client 静默启用。
- 正式 Workspace 不得本地模拟 Task 提交、Runtime 状态、Interaction 或 Result。
- Frontend 不得消费 `TaskDecision`、`RuntimeInvocation`、`WorkflowRun`、`StepRun`、`ToolCall`、`ExecutorRun`、`ApprovalRequest` 等内部对象。
- API route 只负责认证、请求校验和响应序列化；业务逻辑进入 module/application service。
- Phase 3 的 Runtime 采用 API 内模块化单体，逻辑上分为 Control Plane 配置、Managed Runtime、Governance 和 Executor Adapter，不提前拆微服务。
- `pnpm baseline:check` 对 phase code constant、production import mock、正式页面内本地任务 demo、Preview 默认关闭、启动入口和文档语义不变量进行回归检查；`pnpm docs:check` 可单独执行文档一致性检查。
- Gate 记录统一放在 `docs/Chinese/mvp/phase-acceptance/`；每个 Gate 使用独立文件，记录日期、commit、逐项证据、测试、限制、迁移影响和唯一结论。未绑定 commit 的 checklist 不构成正式验收。

## 4. 旧资产处置清单

### 4.1 keep

| 资产 | 结论与理由 |
| --- | --- |
| Auth 页面、Auth Provider、session hook、JWT/security、邮箱验证与 SMTP adapter | 已形成真实纵向能力，边界与新架构不冲突 |
| `users`、`email_verification_codes` | 新账号基线，可直接复用 |
| Workspace detail 的认证、导航和视觉骨架 | 当前真实 Workspace shell，可作为 Phase 1 产品结构起点 |
| `api-client.ts` 中 Auth、Health client | 当前真实 API client |
| `infra/docker-compose.yml`、Alembic、测试设施、`scripts/dev.sh` | 当前本地工程运行基线 |
| 主架构、Presentation、Runtime、视觉和分阶段计划五份权威文档 | 新基线权威来源 |

### 4.2 migrate

| 资产 | 迁移结论 |
| --- | --- |
| `apps/web/src/components/workspace/workspace-detail.tsx` 的本地 task/demo 状态 | 已从正式页面移除；Phase 1 只能通过正式 View Model props 或隔离 Preview 表达任务状态 |
| `/workspace/[workspaceId]` 动态入口 | 已收口删除，避免继续暴露旧容器管理语义 |
| `apps/web/src/lib/api-client.ts` 的 planned action mapping | 已删除，避免不存在的 endpoint 被当作契约；Phase 2 由验证后的 OpenAPI 重新生成/实现 |
| `packages/shared` | 承载 `workspace-presentation-v1` 公开 contract types；继续禁止 Phase 状态和 Runtime DTO |
| `apps/web/src/components/workspace/assistant-rich-content.tsx` | 可作为通用结果内容 renderer 候选，Phase 1 必须在 View Model/组件边界下复核后接入 |
| 当前 Workspace 大型组件 | Phase 1 按 Task Composer、Active Task、Needs Attention、Result/History 拆分，不在 Phase 0 提前冻结 props |

### 4.3 reference

| 资产 | 参考限制 |
| --- | --- |
| `/workspace/phase1-preview` 与 `apps/web/src/mock/preview` | 产品形态探索资产；默认关闭，不连接真实 Runtime，不构成 Gate 1 证据 |
| `astraos_mvp_ui_preview.html` | 已替换为醒目的 superseded notice，不再保留 Agent-first 可执行样片 |
| `vendor/` 浏览器脚本 | 旧 HTML Preview 的未引用依赖，不进入 Next.js production import graph；后续可单独清理 |
| `WORKSPACE_MAIN_UI_COMPONENT_SPEC.md` | 已重写为与 Presentation Contract 对齐的组件拆分辅助规范，不覆盖 Presentation Contract 或阶段计划 |
| `AI_EMPLOYEE_HARNESS_DESIGN.md` | Employee/Harness/Executor 辅助设计，已与正式主权、契约和交付顺序对齐，不定义项目 Phase 状态 |
| `TEMP_WORKSPACE_FIRST_REMEDIATION_PLAN.md` | 已替换为 `superseded` 历史占位，不再保留旧实现口径 |

### 4.4 delete

| 资产 | 处理结果 |
| --- | --- |
| `ASTRAOS_PHASE` 代码常量 | 已删除；Phase 状态只能来自阶段计划和验收记录 |
| 后端包、route namespace 中的旧 Phase 0 文案 | 已删除 |
| 启动脚本中不存在的 Admin/Knowledge/AI Employee URL | 已删除 |
| `projects` route / service / schema / API client | 已删除，避免继续暴露与当前 Phase 目标脱节的 Workspace 容器管理能力 |
| `workspace-launcher.tsx` 与 `/workspace/{workspaceId}` 正式入口 | 已删除，正式入口收口为单一 `/workspace` shell |
| 正式 Workspace 中的 `task_local_*`、本地 submit、硬编码 timeline、assistant demo response | 已删除；若需要样片，只能放入 Preview/fixture |
| API client 中尚未实现的旧 Task/Approval/Context/Result 路由映射 | 已删除，避免形成隐式契约 |

## 5. 新数据基线与迁移策略

新数据基线只包含：

```text
users
email_verification_codes
```

策略：

- `20260714_0001` 是重构后首个 Alembic revision，建立 Auth 基线；`20260716_0002` 删除与当前正式 Workspace 入口脱节的 `projects` 容器表。
- 只允许复用当前基线中的 `users`、`email_verification_codes` 表；任何重构前的 Task、Run、Workflow、Step、ToolCall、Approval、Permission、Audit 或 Executor 表都不进入新 Runtime 主路径。
- 本地/测试环境若仍有旧 schema，使用独立数据库或经人工确认后重建；迁移脚本不得静默删除未知旧表。
- 需要保留的真实旧业务数据必须先导出、映射到未来新 schema，并通过单独、可审计的迁移 revision 导入；禁止直接让新 ORM 绑定旧 Runtime 表。
- Phase 3 新增 Runtime 表时只能通过新的 Alembic revision，并记录 operation identity、恢复与审计要求；不得修改 `20260714_0001` 的历史含义。

## 6. 旧阶段标记清理清单

- [x] 删除 shared package 的 `ASTRAOS_PHASE`。
- [x] 删除后端包描述与 route namespace 的 Phase 0 文案。
- [x] 阶段计划成为唯一状态来源。
- [x] 将 Harness 文档内部 Phase A-F 改为 Sequence A-F，避免与交付 Phase 混淆。
- [x] README 将临时整改文档标为历史参考。
- [x] 正式 Workspace 删除本地 task/demo 状态。
- [x] Preview 默认关闭并与 production 数据源隔离。
- [x] 启动脚本不再公布已删除的旧 Admin 路由。
- [x] 增加自动化基线检查，防止上述标记重新进入正式代码。

## 7. `[MVP-P1]` Phase 1 可执行 backlog

以下任务不依赖未决架构问题，按顺序执行：

1. 在 `apps/web/src/features/workspace/contract` 建立 Presentation View Model 草案，仅包含用户可见 `WorkspaceTaskView`、`TaskProgressView`、`InteractionView`、`ResultView`。
2. 在 `features/workspace/components` 拆分 Task Composer、Active Task、Task Timeline、Needs Attention、通用 Interaction Renderer、Result/History；公开 props 只使用 View Model。
3. 将正式 Workspace composition root 接到一个尚未实现任务时可返回明确 empty/unavailable 状态的 Repository Interface；不得接 mock。
4. 在 `apps/web/src/mock/fixtures` 与 `mock/scenarios` 建立 Customer Support 完整样片，覆盖 submit、needs_context、needs_approval、completed、failed、cancelled 和恢复选择。
5. 将 Preview composition root 显式装配 fixture/repository，并保持 `ENABLE_WORKSPACE_PREVIEWS` 默认关闭。
6. 核对每个 Interaction kind 的用户动作、风险表达、失败恢复和 i18n 文案来源；模型/Executor 不得决定组件或最终 UI 文案。
7. 删除正式 Workspace 中剩余的后端对象导向文案，确保用户无需 Console/trace 即可理解状态和下一步。
8. 为 production-import-mock、Runtime DTO component props、Preview feature gate 和关键状态渲染增加自动测试。
9. 形成 Gate 1 演示说明与证据，但在 Phase 2 Mock 闭环验证前不得宣称字段/OpenAPI/共享类型冻结。

## 8. Gate 0 当前状态

原 Gate 0 验收在实现 commit `d1c3e21f686c292a05988d2b48595bc81eb41504` 上完成，但后续完整文档审计确认产品定位、主权、RuntimeInvocation、Executor 分类和 Presentation 字段冲突在该 commit 中已经存在，因此原验收记录 `phase-acceptance/GATE_0_ACCEPTANCE.md` 已标记为 `superseded`。

文档纠偏基线 commit `0953b8c62b03922e581d9374d6f51ebf0f37798b` 已完成重新验证，正式重新验收记录位于 `phase-acceptance/GATE_0_REACCEPTANCE.md`。后续发现的 Human routing、Governance、Queue 和 Interaction 基础类型缺口记录在 `phase-acceptance/GATE_0_SUPPLEMENTAL_CONSISTENCY_AUDIT.md`；该补充审计已绑定内容 commit `4b91137a221cc598e6ecb5ae01de15f3599eb005` 并标记为 `accepted`，但不单独改变 Gate 状态。当前 Phase 0 和 Phase 1 状态均为 `accepted`；Gate 1 首次未通过记录保留在 `phase-acceptance/GATE_1_ACCEPTANCE.md`，整改后的正式通过记录位于 `phase-acceptance/GATE_1_REACCEPTANCE.md`。Phase 2 已正式启动并进入 `in_progress`；是否 accepted 仍只能由 `PHASED_ENGINEERING_DELIVERY_PLAN.md` 和 Gate 2 正式验收记录证明。本文档、Preview、补充审计或代码常量不能单独证明 Phase 状态。
