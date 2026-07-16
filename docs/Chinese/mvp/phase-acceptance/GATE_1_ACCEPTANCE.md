# Gate 1 首次验收记录

验收日期：2026-07-16

## 1. 验收元数据

- Phase：Phase 1 — Workspace Shape + Semantic Contract Draft
- 验收对象：`workspace-main` 当前工作区中的 Phase 1 实现
- 验收时基准 HEAD：`526df1fa89d7a1744ad9281afbb2f12da0cba720`
- 工作区状态：存在未提交 Phase 1 变更；本记录不能绑定为已验收实现 commit
- 验收结论：`not_accepted`
- Phase 1 状态：`in_progress`
- Phase 2 状态：`blocked`

本记录是 Gate 1 的首次正式验收。`not_accepted` 表示当前实现已经形成可评审的 Phase 1 产品形态，但尚未满足 Gate 0 结转债务和正式化证据要求；它不否定已经通过的产品与架构检查。

## 2. 验收范围

本次验收依据：

- `PHASED_ENGINEERING_DELIVERY_PLAN.md` 第 5 节。
- `MVP_SCOPE_AND_LONG_TERM_ROADMAP.md` 的 `[MVP-P1]` 范围。
- `TASK_PRESENTATION_CONTRACT.md` 的 Workspace Presentation Boundary。
- `WORKSPACE_VISUAL_BASELINE.md` 的 Task-first 产品形态。
- `WORKSPACE_MAIN_UI_COMPONENT_SPEC.md` 的组件与依赖边界。
- `GATE_0_ACCEPTANCE.md`、`GATE_0_REACCEPTANCE.md` 中结转到后续 Gate 的技术债务。

代码审阅覆盖：

- 正式 `/workspace` 产品 shell。
- `/workspace/phase1-preview` 隔离 Preview route。
- `features/workspace/contract` View Model 草案。
- Task Composer、Active Task、Task Timeline、Needs Attention、Interaction、Result / History 组件。
- Customer Support Preview fixture。
- Workspace 样式、Mock 隔离、构建和测试证据。

用户已确认正式 Auth 登录可以正常完成，因此本次不把登录链路作为 Gate 1 阻塞项。

## 3. Gate 1 逐项结论

| Gate 1 条件 | 结论 | 证据与判断 |
| --- | --- | --- |
| 不查看 Console 或 Runtime trace，也能理解任务当前状态和下一步 | 通过 | Preview 以 Active Task、Business progress、Needs Attention 和 Result / History 组织信息；页面语义快照可直接识别当前等待 approval、风险说明和用户动作 |
| 用户界面不围绕后端对象或内部枚举组织 | 通过 | Workspace components 只引用 `features/workspace/contract/view-model.ts`；未发现 `TaskDecision`、`RuntimeInvocation`、`WorkflowRun`、`ToolCall`、Approval 持久化对象或 trace 进入组件 props |
| 至少覆盖 completed、needs_context、needs_approval、failed 和 cancelled | 通过 | Preview coverage、context/approval Interaction、Result 和 History 覆盖五类要求状态 |
| Presentation Contract 草案能表达样片中的交互和恢复路径 | 基本通过 | 草案包含 `WorkspaceTaskView`、`TaskProgressView`、`InteractionView`、`ResultView`，并保留 `error_recovery`、fields、options、actions 和 `nextActions`；当前只是静态语义证据，不代表 Phase 2 动作回写或状态流转已实现 |
| Workspace 产品形态得到确认，但契约仍允许 Phase 2 调整 | 通过 | 类型位于 feature contract 草案，未进入 `packages/shared`，没有 OpenAPI、Pydantic、Repository contract tests 或冻结声明 |
| 正式 Workspace 与 Preview/fixture 隔离，并明确显示 unavailable | 通过 | production `workspace-detail.tsx` 不 import mock；Preview 是唯一 fixture composition root；正式页面使用 `task={null}`、禁用 Composer 和明确 unavailable 文案；默认 Preview HTTP 返回 404 |
| 不把 Phase 2 能力误列为 Gate 1 条件或完成证据 | 通过 | 未建立 `WorkspaceTaskRepository`、Mock Runtime、正式 Presentation Projector、OpenAPI 或 contract tests；静态 Interaction renderer 不构成完整 Mock 闭环证据 |

Gate 1 产品与架构条件整体通过。最终不能 accepted 的原因来自 Gate 0 已明确绑定到 Gate 1 的工程技术债务和验收证据要求。

## 4. Gate 0 结转技术债务复核

| ID | Gate 0 约束 | 当前状态 | Gate 1 判断 |
| --- | --- | --- | --- |
| TD-01 | Gate 1 前建立基础 CI，自动执行 baseline、docs、lint、typecheck、build 和 pytest，并在失败时阻止合并 | 未关闭 | 仓库没有可执行 CI workflow；当前检查只在本地运行。该项明确阻塞 Gate 1 |
| TD-02 | Gate 1 前完成 Workspace 组件与样式边界拆分，不再向单一 `globals.css` 堆叠 Workspace 状态样式 | 未关闭 | 组件已经拆分，但本轮仍向 `apps/web/src/styles/globals.css` 增加约 216 行 Workspace 样式；文件当前约 6867 行并包含大量 `.workspace-*` 规则。该项明确阻塞 Gate 1 |
| TD-03 | Gate 1 前把 Preview View 类型迁移到正式 `features/workspace/contract`，Mock 与正式组件只共同依赖公开 contract types | 已关闭 | View Model 已迁移到 `apps/web/src/features/workspace/contract/view-model.ts`；production 不 import mock，Preview fixture 反向依赖 contract types |
| TD-05 | 目标 Gate 1 前清理 `passlib` / `crypt` warning，最迟 Gate 3 前完成 | 未关闭，当前不单独阻塞 Gate 1 | Python 3.12 pytest 仍有同一 deprecation warning；维持原最晚 Gate 3 约束，不静默宣称关闭 |
| TD-07 | Gate 1 前由干净 CI 构建稳定性证明关闭 Next.js 缓存问题 | 部分验证，未关闭 | 本地删除 `.next` 后连续两次 production build 通过，但没有 TD-01 所要求的干净 checkout CI 证据，因此不能正式关闭，也阻塞 Gate 1 |

TD-04 和 TD-06 的最晚约束仍是 Gate 2，本次没有提前把它们列为 Gate 1 阻塞项。

## 5. 自动与运行验证

所有命令均在验收时当前工作区执行；由于 Phase 1 变更未提交，这些结果只证明当次工作区快照，不构成 commit-bound Gate 证据。

| 验证 | 结果 |
| --- | --- |
| `pnpm docs:check` | 通过 |
| `pnpm baseline:check` | 通过 |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `rm -rf apps/web/.next && pnpm --filter @astraos/web build` | 连续两次通过；Next.js production build 完成 |
| `cd services/api && uv lock --check` | 通过 |
| `cd services/api && .venv/bin/pytest` | 11 passed；保留 1 个 `passlib` / `crypt` deprecation warning |
| 默认配置 `GET /workspace/phase1-preview` | HTTP 404，Preview 默认关闭 |
| `ENABLE_WORKSPACE_PREVIEWS=true` 时 `GET /workspace/phase1-preview` | HTTP 200 |
| Preview 页面语义检查 | Task Composer、Active Task、Task Timeline、Needs Attention、context、approval、Result / History 和五类目标状态均可识别 |
| production/mock import 审计 | 正式 Workspace 未导入 mock/fixture；Preview route 是 fixture 的显式 composition root |
| `git diff --check` | 通过 |

## 6. 已确认的 Phase 1 交付

- 建立了 Task-first 的 Workspace 产品骨架。
- View Model 草案只表达用户可见的 Task、Progress、Interaction 和 Result 语义。
- Customer Support 隔离 Preview 覆盖 context、approval、result、failure 和 cancellation。
- 正式 `/workspace` 复用产品骨架，但继续诚实显示 Task unavailable，未伪造 Runtime 能力。
- Mock/fixture 与 production 路径保持物理和依赖隔离。
- 未提前接入真实 Runtime、Tool、副作用、Repository contract、OpenAPI 或共享契约冻结。

## 7. 重新验收前必须完成

1. 新增基础 CI workflow，在干净 checkout 中自动运行 `pnpm baseline:check`、`pnpm docs:check`、`pnpm lint`、`pnpm typecheck`、Web production build、`uv lock --check` 和 API pytest；CI 失败必须阻止合并。
2. 把 Phase 1 Workspace 专属样式迁出单一 `globals.css`，建立与 `features/workspace/components` 对齐的样式边界；全局文件只保留真正的全局 token、reset 和跨页面基础样式。
3. 使用上述 CI 的干净构建证据正式关闭 TD-07。
4. 把 Phase 1 实现和整改内容提交到一个明确 commit，再在该 commit 上重新执行全部验证并绑定完整 SHA。
5. TD-05 若不在重新验收前关闭，重新验收记录必须继续明确其风险和 Gate 3 最晚期限。

## 8. 架构、契约与数据影响

- 架构：Presentation Boundary、Mock 隔离和 production unavailable 边界符合 Phase 1 设计。
- 契约：当前 View Model 仍是可调整草案；不得因为本次产品项通过而宣称 Phase 2 contract freeze 已完成。
- 数据：没有新增 Task、Interaction、Runtime、Tool、Approval 或 Result 持久化对象。
- Runtime：没有接入真实 Runtime、Workflow、External Agent 或产生副作用的 Tool。
- Phase：Phase 1 已实际开始且仍需整改，因此状态为 `in_progress`；Phase 2 继续 `blocked`。

## 9. 最终结论

Phase 1 的产品形态、Presentation View Model 草案、Customer Support 静态样片、production unavailable 状态和 Mock 隔离已经达到 Gate 1 的主要产品与架构要求。

但是，Gate 0 明确规定 Gate 1 前必须关闭的 TD-01、TD-02 和 TD-07 尚未关闭；同时当前实现没有提交并绑定验收 commit。根据 Gate 0 的债务治理规则，这些项目不能静默延期，也不能用本地 typecheck、lint 或 build 替代。

正式结论：`not_accepted`。

Phase 1 保持 `in_progress`，Phase 2 保持 `blocked`。完成第 7 节整改并形成 commit-bound 证据后，应新增 Gate 1 重新验收记录；只有重新验收通过后，Phase 1 才能改为 `accepted`。
