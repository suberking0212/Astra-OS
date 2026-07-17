# Phase 0～2 技术债务统一台账与当前落实审计

审计时间：2026-07-17 14:13 +08:00  
审计分支：`codex/phase-2-mock-contract`  
审计起点 commit：`d10474f0c83d8f33dc8c0714a86c38d17e0210c8`

## 1. 定位

本文档汇总 Phase 0～2 的技术债务、原始预期解决时间、历史关闭节点和当前工作区实际证据。它是债务审计索引，不取代以下权威记录：

- 原始债务定义：`phase-acceptance/GATE_0_ACCEPTANCE.md`、`GATE_0_REACCEPTANCE.md`。
- Phase 1 首次复核与整改：`GATE_1_ACCEPTANCE.md`、`GATE_1_REACCEPTANCE.md`。
- Phase 2 实施与验收：`PHASE_2_IMPLEMENTATION_PLAN.md`、`GATE_2_ACCEPTANCE.md`。
- Phase 状态唯一权威：`PHASED_ENGINEERING_DELIVERY_PLAN.md`。

Phase 0 建立了唯一一组编号技术债务 `TD-01`～`TD-07`。Phase 1 和 Phase 2 没有新增编号技术债务；它们负责按既定 Gate 期限关闭 Phase 0 结转项。Phase 1 另外识别了 commit-bound 验收证据缺口，以及远程仓库接入后配置 required checks 的运维跟进项。

## 2. 当前总览

| ID | 原始问题 | 原定解决时间 | 实际关闭节点 | 当前状态 |
| --- | --- | --- | --- | --- |
| TD-01 | 缺少自动 CI，失败不能阻止合并 | Phase 1 建基础 CI；Gate 2 前加入 contract tests | Phase 1 完成 workflow；Phase 2 加入 contract tests；2026-07-17 验证 GitHub required checks | `closed` |
| TD-02 | Workspace 状态样式继续堆积在 `globals.css` | Gate 1 前 | Gate 1 重新验收 | `closed_to_defined_scope` |
| TD-03 | Preview View 类型位于 Mock fixture，契约未冻结 | Gate 1 前迁移；Gate 2 前冻结 | Gate 1 完成边界迁移；Gate 2 冻结 v1 | `closed` |
| TD-04 | `projects` 数据命名与 Workspace 产品语义冲突 | Gate 2 前决策；必要迁移阻塞 Phase 3 | 基线整改 migration 删除 `projects`；Gate 2 冻结术语规则 | `closed` |
| TD-05 | `passlib` 依赖 Python `crypt` 弃用能力 | 目标 Gate 1；最迟 Gate 3 | Gate 1 重新验收 | `closed` |
| TD-06 | `dev.sh` 可能误杀同端口无关进程 | 原目标 Phase 1；最迟 Gate 2 | Gate 2 | `closed` |
| TD-07 | Next.js `.next` 缓存不一致，缺少 clean build 证据 | Gate 1 前 | Gate 1 重新验收 | `closed` |

## 3. 逐项审计

### TD-01：CI、contract tests 与合并阻断

原始期限：

- Gate 1 前完成基础 CI：docs、baseline、lint、typecheck、build、pytest。
- Gate 2 前加入 contract tests。
- CI 失败必须阻止合并。

当前工作区落实：

- `.github/workflows/ci.yml` 定义 `Web and docs`、`API` 两个 job。
- Web job 执行 frozen install、docs、baseline、lint、typecheck、Repository contract tests、TD-06 shell contract 和 cold Next.js build。
- API job使用 Python 3.12、PostgreSQL test service、locked dependency 和 pytest。
- `workspace-task-repository.contract.test.ts` 对 Mock/API Repository 运行同一套 6 个 tests。
- 当前本地复核：docs、baseline、lint、typecheck、6 个 Web contract tests、18 个 API tests 全部通过。

远程合并阻断证据：

- GitHub Repository Ruleset ID：`19083264`，名称：`Protect workspace-main`。
- enforcement：`active`；目标：`refs/heads/workspace-main`。
- required status checks：`API`、`Web and docs`。
- `strict_required_status_checks_policy = true`。
- `do_not_enforce_on_create = false`。
- `bypass_actors = []`；`current_user_can_bypass = never`。
- 同一 Ruleset 还要求 Pull Request，并禁止 deletion 和 non-fast-forward。
- 核验命令：`gh api repos/suberking0212/Astra-OS/rulesets/19083264`。
- 核验时间：2026-07-17 14:09 +08:00。

结论：代码、自动测试和远程合并阻断均已实际落实，TD-01 关闭。

### TD-02：Workspace 样式边界

原始期限：Gate 1 前。

当前工作区落实：

- Phase 1 Task、Interaction、Result、History、Composer、Timeline 状态样式位于 `apps/web/src/features/workspace/styles/workspace-task.css`。
- `apps/web/src/app/layout.tsx` 显式引入 feature stylesheet。
- 当前审计未在 `globals.css` 找到 `.workspace-task-card`、`.workspace-state-pill`、`.workspace-interaction-*`、`.workspace-composer-*`、`.workspace-history-*`、`.workspace-result-*` 或 `.workspace-timeline-*` 等 Phase 1/2 组件选择器。

剩余边界：

- `globals.css` 当前仍约 6268 行，包含历史 shell、Admin/旧 Workspace 和 `agent-*` 样式。
- 原债务完成标准不是重写全部全局样式，而是停止把 Phase 1 Task 状态样式继续堆入全局文件。

结论：按原定义范围关闭；全局 CSS 的长期精简不是 Gate 1/2 已承诺完成的工作。

### TD-03：View Model 边界与契约冻结

原始期限：Gate 1 前迁移类型；Gate 2 前冻结。

当前工作区落实：

- 正式类型位于 `packages/shared/src/workspace-presentation-v1.ts`。
- feature contract 只从 `@astraos/shared` 重导出类型。
- `WorkspaceTaskRepository` Interface 与 API/Mock 两个实现共同依赖 shared View Model。
- Pydantic schema 位于 `services/api/app/modules/workspace/schemas.py`。
- 冻结 OpenAPI artifact 位于 `services/api/openapi/astraos-v1.json`。
- API/Projector tests 验证 OpenAPI artifact 与 `app.openapi()` 全量一致。
- production/mock import baseline audit 当前通过。

结论：Gate 1 的边界迁移和 Gate 2 的正式冻结均已落实，TD-03 关闭。

### TD-04：Project / Workspace 命名

原始期限：Gate 2 前完成长期命名决策；若需要改表，迁移必须在 Phase 3 正式实现前完成。

当前工作区落实：

- `ARCHITECTURE_BASELINE.md` 规定 Workspace 是产品、API、Presentation Contract 和未来 Runtime scope 的正式术语。
- `Project` 不作为 Workspace 的公开别名。
- migration `20260716_0002_remove_projects_workspace_container.py` 在 upgrade 中删除历史 `projects` 表。
- 当前 `services/api/app`、Workspace feature 和 shared contract 中没有 `projects`、`project_id` 或 `/projects` 正式业务路径。
- 历史基线 migration `0001` 仍保留创建 `projects` 的历史事实，再由 `0002` 删除；这符合“不修改既有基线 revision”的规则。
- Phase 3 如果需要持久化 Workspace，必须新增 `workspaces` 模型和新 revision。

结论：命名决策和已有数据迁移均已落实；当前不存在阻塞 Phase 3 的遗留 `projects` 容器，TD-04 关闭。

### TD-05：`passlib` / `crypt` 弃用

原始期限：目标 Gate 1，最迟 Gate 3。

当前工作区落实：

- `services/api/pyproject.toml` 和 `uv.lock` 不包含 `passlib`。
- `services/api/app/core/security.py` 直接使用 `bcrypt.hashpw` / `bcrypt.checkpw`。
- 当前使用 `pytest -W error::DeprecationWarning` 执行 18 个 tests，全部通过。

结论：已提前在 Gate 1 关闭，当前没有回归。

### TD-06：`dev.sh` 端口清理安全

原始期限：不阻塞 Gate 1，但必须在 Gate 2 前完成。

当前工作区落实：

- `scripts/lib/dev-processes.sh` 只有在 PID 文件、仓库路径和服务命令特征共同匹配时才终止旧进程。
- 未知端口占用者默认输出 PID/command 并退出，不会被终止。
- 只有显式设置 `ASTRAOS_FORCE_PORT_CLEANUP=true` 才清理未知占用者。
- `scripts/tests/test-dev-process-cleanup.sh` 覆盖 owned、unknown refusal 和 explicit force 三条路径。
- 当前 shell contract test 通过。

结论：Gate 2 前完成并经当前工作区复验，TD-06 关闭。

### TD-07：Next.js clean build

原始期限：Gate 1 前。

当前工作区落实：

- CI 在 build 前执行 `test ! -d apps/web/.next`，保证 clean checkout 起点。
- Gate 1 重新验收在独立 clean worktree 中复现成功。
- Gate 2 对当前实现再次执行清理 `.next` 后的 production build并通过。

结论：clean build 路径已经自动化并有重复证据，TD-07 关闭。

## 4. 非编号验收与运维跟进项

### commit-bound 验收证据

- 来源：Gate 1 首次验收。
- 预期：Gate 1 重新验收前。
- 落实：Phase 1 整改绑定 commit `8b07f5ccb862989ebe402dac8323b65c136d9548`；Phase 2 实现绑定 commit `77f617e5c21d25afb70d54bd5b0d2ea35747330a`。
- 状态：`closed`。

### GitHub required checks 配置

- 来源：Gate 1 重新验收；当时没有 Git remote，因此要求接入远程仓库后完成。
- 预期：远程仓库接入后，最迟在 Gate 2 证据补全时核验。
- 落实：2026-07-17 通过 GitHub CLI 确认 Ruleset `19083264` 为 active，严格要求 `API` 和 `Web and docs`，无 bypass actor。
- 状态：`closed_and_verified_external`。

## 5. 当前时间点结论

- Phase 0～2 的 7 个编号技术债务均达到各自原始完成标准。
- Phase 1 首次验收的 commit-bound 证据缺口已关闭。
- GitHub required checks 已通过远程 API 实际核验，不再只是 workflow 文件存在。
- Phase 2 实施 backlog 当前没有未勾选项。
- 当前工作区唯一未跟踪文件 `BACKUP_GUIDE.md` 是用户已有文件，不属于 Phase 0～2 技术债务，也未纳入任何验收 commit。
- 本结论不表示 `globals.css` 已完成全面重构，也不表示 Phase 3 的真实 Runtime、持久化 Workspace 或 Tool 能力已经开始。

## 6. 当前工作区复验结果

2026-07-17 14:12～14:13 +08:00 在当前分支重新执行：

```text
pnpm lint
pnpm typecheck
pnpm docs:check
pnpm baseline:check
pnpm contract:check
services/api/.venv/bin/pytest services/api/app/tests -q -W error::DeprecationWarning
services/api/.venv/bin/ruff check services/api/app services/api/scripts
rm -rf apps/web/.next
test ! -d apps/web/.next
pnpm --filter @astraos/web build
```

结果：

- ESLint、TypeScript、文档一致性、重建边界和 Ruff 全部通过。
- Mock/API Repository 共同 contract tests：`6 passed`。
- API/Auth/Projector/OpenAPI tests：`18 passed`，DeprecationWarning 作为 error 时仍通过。
- TD-06 shell contract：owned、unknown refusal、explicit force 全部通过。
- Next.js 15.5.20 cold production build 通过，7 个 routes 全部成功生成。
- `git diff --check` 通过。
