# Gate 2 正式验收记录

验收日期：2026-07-17  
验收结论：`accepted`  
Phase 2 状态：`accepted`  
Phase 3 状态：`not_started`  
对应实现 commit：`77f617e5c21d25afb70d54bd5b0d2ea35747330a`  
对应分支：`codex/phase-2-mock-contract`

## 1. 验收范围

本记录验收 Phase 2 Mock 产品闭环与 `workspace-presentation-v1` 工程契约冻结，覆盖：

- `WorkspaceTaskRepository` Interface。
- production `ApiWorkspaceTaskRepository` 与隔离 `MockWorkspaceTaskRepository`。
- production / preview / backend mock composition root 隔离。
- submit、reference metadata、provide context、approve/reject、retry/cancel、result/failure recovery。
- 确定性 Presentation Projector。
- OpenAPI artifact、Pydantic schemas、TypeScript shared View Model。
- Mock/API Repository 共同 contract tests。
- TD-04 project/workspace 命名决策与 TD-06 `dev.sh` 端口清理收敛。

本验收不包含真实 Runtime、LLM、Tool、Executor、Browser、Governance write、外部 API、真实文件上传或任何真实业务副作用。

## 2. Gate 2 条件核对

| 条件 | 结论 | 证据 |
| --- | --- | --- |
| 不接 LLM 和真实 Tool 完成 Customer Support 样片 | 通过 | 前后端隔离 Mock 状态机覆盖 submit -> context -> approval -> result，以及 reject/cancel/failure/retry；Mock Runtime 无 DB、网络、Executor 或 Tool 依赖 |
| Mock/API Repository 返回同一 View Model 并运行共同 contract tests | 通过 | `workspace-task-repository.contract.test.ts` 对两个 factory 执行同一 3 组、共 6 个测试 |
| TypeScript、Pydantic、OpenAPI 自动验证一致性 | 通过 | shared TypeScript types 通过 typecheck/contract fixtures；Pydantic response models 通过 API tests；`astraos-v1.json` 与 `app.openapi()` 全量相等 |
| 正式 Workspace 不 import mock | 通过 | production/mock import baseline audit 通过；production composition root 只构造 `ApiWorkspaceTaskRepository` |
| 页面和组件无 `isMock` 或等价数据源分支 | 通过 | 数据源只在 composition root 选择；可复用 surface/components 只消费 Repository Interface 和 View Model |
| Component props/state 不包含 Runtime DTO | 通过 | frontend 只依赖 `@astraos/shared` Presentation types；Runtime DTO 只存在于 backend application/mock boundary |
| Projector 覆盖主要状态、Interaction、结果和恢复 | 通过 | API/Projector tests 覆盖 needs_context、needs_approval、completed、failed、cancelled、input、approval、error_recovery、succeeded/failed/cancelled result |
| 删除 Mock 不要求重写 production component/types/API repository | 通过 | Mock 位于 `apps/web/src/mock`、`services/api/app/mock` 和显式 mock composition root；production 共同依赖公开 contract/interface |
| 破坏性变更需要版本化或迁移 | 通过 | 契约标识固定为 `workspace-presentation-v1`，兼容规则写入实施方案和 Presentation Contract |

## 3. 自动验证结果

以下命令在实现 commit 对应工作区快照执行并通过：

```text
pnpm docs:check
pnpm baseline:check
pnpm lint
pnpm typecheck
pnpm --filter @astraos/web test:contract
pnpm contract:check
rm -rf apps/web/.next && pnpm --filter @astraos/web build
services/api/.venv/bin/ruff check services/api/app services/api/scripts
services/api/.venv/bin/pytest services/api/app/tests -q
bash -n scripts/dev.sh scripts/lib/dev-processes.sh scripts/tests/test-dev-process-cleanup.sh
git diff --check
```

结果摘要：

- Web Repository contract tests：`6 passed`。
- API/Auth/Projector/OpenAPI tests：`18 passed`。
- Next.js production build：通过；`/workspace`、`/workspace/phase1-preview`、`/workspace/phase2-preview` 全部成功构建。
- Ruff、ESLint、TypeScript、文档一致性、重建边界、shell syntax、diff whitespace：全部通过。
- Mock API 默认关闭测试：`ENABLE_MOCK_WORKSPACE_API=false` 时 OpenAPI 不注册 Workspace Mock endpoints。

## 4. 契约冻结结论

冻结的公开边界为：

- TypeScript：`packages/shared/src/workspace-presentation-v1.ts`。
- Pydantic：`services/api/app/modules/workspace/schemas.py`。
- OpenAPI：`services/api/openapi/astraos-v1.json`。
- Repository：`apps/web/src/features/workspace/repositories/workspace-task-repository.ts`。
- Projector：`services/api/app/modules/workspace/projector.py`。

允许在 v1 新增向后兼容的可选字段。删除或重命名字段、改变字段语义或可空性、收窄枚举值属于破坏性变更，必须发布新版本或提供显式迁移层。

OpenAPI 未暴露 `RuntimeInvocation`、`ToolCall`、`WorkflowRun`、`StepRun`、Executor event、raw prompt、token、cookie 或内部幂等信息。

## 5. 技术债务关闭

### TD-01：CI、contract tests 与 required checks

状态：`closed`。

- Phase 1 已建立 `Web and docs`、`API` 两个 CI job；Phase 2 已加入 Repository contract tests 和 TD-06 shell contract test。
- 2026-07-17 14:09 +08:00 使用 GitHub CLI 核验 Repository Ruleset `19083264`（`Protect workspace-main`）为 `active`。
- Ruleset 严格要求 `API`、`Web and docs` 两项 status checks，`strict_required_status_checks_policy = true`。
- Ruleset 要求 Pull Request，禁止 deletion 和 non-fast-forward；`bypass_actors = []`，当前用户不能绕过。
- 核验命令：`gh api repos/suberking0212/Astra-OS/rulesets/19083264`。

Gate 1 重新验收中“当时没有 Git remote”的陈述保留为历史事实；本节补充远程仓库接入后的实际配置证据。

### TD-03：View Model 正式冻结

状态：`closed`。

- Gate 1 已完成 View Model 与 Mock fixture 的边界迁移。
- Gate 2 已冻结 `workspace-presentation-v1` 的 TypeScript、Pydantic、OpenAPI、Repository 和 Projector boundary。
- Mock/API Repository 共同 contract suite 与 OpenAPI freeze test 均通过。

### TD-04：project / workspace 命名

状态：`closed`。

- `Workspace` 是产品、API、Presentation Contract 和未来 Runtime scope 的唯一正式术语。
- `Project` 不是 Workspace 的公开别名；不进入 v1 endpoint、schema 或 View Model。
- 历史 `projects` 表不恢复。Phase 3 若需要持久化容器，新增 `workspaces` 模型和 Alembic revision，不修改基线 migration。
- 未来真正的 Project 必须具有独立业务语义和标识，不能与 Workspace 静默互换。

### TD-06：dev.sh 端口清理

状态：`closed`。

- PID 文件进程只有同时匹配仓库路径和服务命令特征时才会被终止。
- 未知端口占用者默认只输出 PID/command 诊断并退出，不会被终止。
- 只有用户显式设置 `ASTRAOS_FORCE_PORT_CLEANUP=true` 才执行未知端口强制清理。
- shell contract test 覆盖 owned、unknown refusal 和 explicit force 三条路径。

## 6. 安全与 Phase 边界

- Mock Task 只存于进程内存，未新增 Runtime/Task 数据表或 migration。
- Reference 只传递文件名和 media type metadata，不上传或写入 Storage。
- Approval 只改变 Mock 状态，不创建 PermissionGrant、ApprovalRequest、业务记录或外部 follow-up。
- Result 中明确标识 mock follow-up 未写入真实系统。
- Backend production composition root 不 import mock；只有显式开关装配 mock endpoints。
- Phase 3/4 之前仍禁止接入真实 Runtime、真实 Tool、真实 Governance write 和真实副作用。

## 7. 最终结论

Gate 2 全部条件通过；TD-01 的 Phase 2 contract/required-checks 收尾、TD-03 契约冻结、TD-04 命名决策与 TD-06 端口清理均已关闭，`workspace-presentation-v1` 正式冻结。Phase 2 更新为 `accepted`，Phase 3 解除阻塞并进入 `not_started`；开始 Phase 3 前仍需单独正式启动，不能把本次 Mock 能力解释为真实 Runtime 已存在。

本记录的代码与契约结论绑定实现 commit `77f617e5c21d25afb70d54bd5b0d2ea35747330a`；TD-01 的 GitHub Ruleset 条目是 2026-07-17 在远程仓库完成的补充外部核验证据。
