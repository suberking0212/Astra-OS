# Gate 1 重新验收记录

验收日期：2026-07-16

## 1. 验收元数据

- Phase：Phase 1 — Workspace Shape + Semantic Contract Draft
- 对应整改实现 commit：`8b07f5ccb862989ebe402dac8323b65c136d9548`
- 分支：`workspace-main`
- 前一验收记录：`GATE_1_ACCEPTANCE.md`，结论 `not_accepted`
- 验收结论：`accepted`
- Phase 1 状态：`accepted`
- Phase 2 状态：`not_started`

本次重新验收针对首次 Gate 1 验收识别出的 TD-01、TD-02、TD-07、commit-bound 证据缺口，以及继续开放的 TD-05 完成整改和复核。

## 2. 整改范围与结果

| 整改项 | 结果 | 实现证据 |
| --- | --- | --- |
| TD-01 基础 CI | 已关闭 | 新增 `.github/workflows/ci.yml`；`pull_request` 和目标分支 push 自动执行 Web/Docs 与 API 两个 job，覆盖依赖锁定、docs、baseline、lint、typecheck、cold build、uv lock 和 pytest |
| TD-02 Workspace 样式边界 | 已关闭 | Phase 1 Task、Interaction、Result、History、Composer 和 Timeline 样式迁移到 `apps/web/src/features/workspace/styles/workspace-task.css`；`globals.css` 不再包含 Phase 1 Workspace 状态和组件选择器 |
| TD-03 View Model 边界 | 保持关闭 | View Model 位于 `features/workspace/contract`；production 不依赖 mock，Preview fixture 只共同依赖 contract types |
| TD-05 `passlib` / `crypt` warning | 已关闭 | 移除 `passlib`，使用现有 `bcrypt` 直接生成和校验兼容 bcrypt hash；锁文件移除 passlib；pytest 零 warning |
| TD-07 Next.js clean build | 已关闭 | CI workflow 在 checkout 后显式断言 `.next` 不存在再执行 production build；整改 commit 在全新 Git worktree 中复现 workflow 并成功完成 cold build |
| commit-bound 证据 | 已关闭 | Phase 1 实现和整改已经提交，重新验收绑定完整 commit `8b07f5ccb862989ebe402dac8323b65c136d9548` |

首次 clean-checkout API 验证发现测试依赖开发机 `.env` 隐式开启邮箱验证，导致 4 项测试在纯净环境失败。整改后 `services/api/app/tests/conftest.py` 显式设置测试所需的 `EMAIL_VERIFICATION_ENABLED=true`，使测试环境自包含；最终 clean-checkout 复验 11 项测试全部通过。

当前仓库没有配置 Git remote，因此没有可绑定的托管平台 workflow run。CI workflow 的仓库实现和 job 命令已经完成，并在独立 clean worktree 中逐项复现。未来连接 GitHub 后，`Web and docs` 与 `API` 应配置为保护分支的 required checks；在当前没有远程合并入口的仓库状态下，该托管配置不是 Gate 1 的现存运行阻塞。

## 3. Gate 1 逐项结论

| Gate 1 条件 | 结论 | 证据 |
| --- | --- | --- |
| 不查看 Console 或 Runtime trace，也能理解任务当前状态和下一步 | 通过 | Active Task、Business progress、Needs Attention、Interaction actions 和 Result / History 直接表达用户状态和下一步 |
| 用户界面不围绕后端对象或内部枚举组织 | 通过 | Workspace components 只消费 Presentation View Model；未暴露 RuntimeInvocation、ToolCall、WorkflowRun、ApprovalRequest 或 trace |
| 至少覆盖 completed、needs_context、needs_approval、failed 和 cancelled | 通过 | Customer Support Preview coverage、Interaction、Result 和 History 覆盖全部要求状态 |
| Presentation Contract 草案能表达样片中的交互和恢复路径 | 通过 | `WorkspaceTaskView`、`TaskProgressView`、`InteractionView`、`ResultView` 及 fields/options/actions/error_recovery/nextActions 可以表达 Phase 1 静态样片；未越权宣称 Phase 2 状态回写已实现 |
| Workspace 产品形态确认且契约仍允许 Phase 2 调整 | 通过 | 草案保留在 feature contract，未进入 shared/OpenAPI/Pydantic freeze |
| 正式 Workspace 与 Preview/fixture 隔离并明确 unavailable | 通过 | production 不 import mock；Preview 是显式 composition root且默认关闭；production Composer 禁用并显示 Task unavailable |
| 不以 Phase 2 能力作为 Gate 1 必选项 | 通过 | 未建立 Repository contract、Mock Runtime、正式 Projector、OpenAPI 或 contract tests |

## 4. Clean-checkout 自动验证

验证对象：独立 Git worktree，detached at `8b07f5ccb862989ebe402dac8323b65c136d9548`；开始时不存在 `node_modules`、`.venv` 或 `.next`。

| 验证 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 通过 |
| `pnpm docs:check` | 通过 |
| `pnpm baseline:check` | 通过 |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `test ! -d apps/web/.next` | 通过，确认 cold build 起点 |
| `pnpm --filter @astraos/web build` | 通过，Next.js production build 完成 |
| `uv sync --locked --extra dev` | 通过 |
| `uv lock --check` | 通过 |
| `uv run --locked --extra dev pytest` | 11 passed，零 warning |

本地工作区还额外连续两次删除 `.next` 后执行 Web production build，两次均通过。

## 5. 产品、架构与范围复核

- Workspace 主路径已经围绕 Task Composer、Active Task、Needs Attention 和 Result / History 建立。
- Customer Support Preview 覆盖 context、approval、result、failure 和 cancellation。
- 正式 Workspace 继续只连接 Auth，并明确表示 Task capability unavailable。
- Preview/fixture 与 production 路径保持物理和依赖隔离。
- Workspace Components 不解释 Runtime 状态机，也不消费 Runtime DTO。
- 没有实现真实 Workflow、External Agent、Tool side effect、Runtime persistence 或 Governance Approval。
- 没有提前冻结 OpenAPI、Pydantic、TypeScript shared contract、Repository 或 contract tests。

## 6. 后续债务与 Phase 2 约束

Gate 0 中未要求 Gate 1 关闭的项目继续按原期限治理：

- TD-04：Gate 2 前完成 `project` / `workspace` 长期命名决策；当前 production 数据基线已经移除脱节的 `projects` 容器表，Phase 2 冻结 API 时仍须确认术语规则。
- TD-06：Gate 2 前收敛 `scripts/dev.sh` 的端口归属判断，避免误终止同端口无关进程。
- Phase 2 接入远程仓库后，应把 CI 的 `Web and docs` 与 `API` job 配置为 required checks。

这些项目不阻塞 Gate 1，但不得在 Gate 2 中静默遗漏。

## 7. 最终结论

Phase 1 的产品形态、Presentation View Model 草案、Customer Support 隔离 Preview、production unavailable 边界、Mock 隔离、组件与样式边界、基础 CI、clean build 稳定性和测试环境自包含均已形成可重复验证的工程证据。

首次验收识别的 Gate 1 阻塞项已经全部关闭，且没有引入 Phase 2 及以后能力越权。

正式结论：`accepted`。

Phase 1 更新为 `accepted`，Phase 2 解除阻塞并更新为 `not_started`。
