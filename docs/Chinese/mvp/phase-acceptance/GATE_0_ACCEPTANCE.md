# Gate 0 正式验收记录

验收日期：2026-07-16

## 1. 验收元数据

- Phase：Phase 0 — Rebuild Baseline
- 对应实现 commit：`d1c3e21f686c292a05988d2b48595bc81eb41504`
- 分支：`workspace-main`
- 验收结论：`accepted`
- 下一阶段状态：Phase 1 解除阻塞，回到 `not_started`

## 2. Gate 逐项结论

| Gate 0 条件 | 结论 | 证据 |
| --- | --- | --- |
| 文档之间不存在架构主权冲突 | 通过 | `REBUILT_ENGINEERING_BASELINE.md` 第 1 节明确五份权威文档的优先级和唯一职责；临时整改文档已降级为历史参考 |
| 所有重构前核心资产都有明确处置结论 | 通过 | `REBUILT_ENGINEERING_BASELINE.md` 第 4 节覆盖 Workspace、Preview、Mock、API、schemas、数据库、shared、client、脚本、README 和历史文档的 keep/migrate/reference/delete 结论 |
| 正式代码不会被旧 Mock、Preview 或阶段标记静默驱动 | 通过 | 正式 Workspace 不 import mock；本地任务 demo 和 planned API mapping 已移除；Preview 默认关闭；`pnpm baseline:check` 通过 |
| 团队能回答真实入口、真实数据源和正式契约分别在哪里 | 通过 | `REBUILT_ENGINEERING_BASELINE.md` 第 2 节和 README 明确 Web/API 入口、PostgreSQL 数据表和契约冻结阶段 |
| Phase 1 不再依赖尚未决定的架构问题 | 通过 | production/mock/preview/test、Presentation、Runtime、Governance、Executor、数据迁移和验收记录边界已确定；第 7 节 backlog 可直接执行 |

## 3. 自动验证

所有命令均在实现 commit `d1c3e21f686c292a05988d2b48595bc81eb41504` 上执行。

| 验证 | 结果 |
| --- | --- |
| `pnpm baseline:check` | 通过 |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm --filter @astraos/web build` | 通过；清理 `.next` 缓存后稳定完成 production build |
| `cd services/api && .venv/bin/alembic upgrade head` | 通过 |
| `cd services/api && .venv/bin/pytest` | 14 passed；存在一个第三方 `passlib`/`crypt` deprecation warning |
| `bash -n scripts/dev.sh` | 通过 |
| `./scripts/dev.sh` | 通过；自动清理旧 API/Web/log 进程，完成基础设施健康检查、迁移和应用启动 |
| `GET http://localhost:8000/health` | HTTP 200，PostgreSQL `ok` |
| `GET http://localhost:3000/workspace` | HTTP 200 |
| `GET http://localhost:3000/workspace/phase1-preview`（默认配置） | HTTP 404 |
| `git diff --check` | 通过 |

## 4. 实现效果

- 正式 Workspace 只读取 Auth 和 Project API，不再显示或提交本地模拟 Task。
- 当前真实数据基线固定为 `users`、`email_verification_codes`、`projects`。
- Preview/fixture 位于独立目录，通过显式环境开关启用，生产默认关闭。
- Phase 状态不再由共享常量、启动文案、路由名或 Preview 标题表达。
- 本地启动脚本可以重建开发环境，并可靠清理上一次运行留下的进程。
- Phase 1 已有明确的 Presentation View Model、组件拆分、Preview scenario 和测试 backlog。

## 5. 已知限制与技术债务

以下项目不阻塞 Gate 0，但必须在后续阶段持续治理：

1. 当前没有 CI 自动执行 baseline、lint、typecheck、build 和 pytest；现阶段证据来自本地固定 commit 验证。
2. `apps/web/src/styles/globals.css` 体积较大，Workspace 组件和样式需要在 Phase 1 模块化。
3. Preview 的 View 类型仍位于 Mock fixture；Phase 1 应迁移到正式 Presentation contract 目录，Mock 与正式实现只共同依赖公开类型。
4. 数据库存储对象仍命名为 `projects`，产品语义使用 Workspace；Phase 0 决定保留表并明确映射，不做破坏性重命名。
5. Python 3.12 测试存在 `passlib` 对 `crypt` 的弃用警告；进入生产候选前需要升级密码哈希实现或明确 Python 版本策略。
6. `scripts/dev.sh` 的端口兜底清理会终止占用配置端口的进程；开发者应使用自定义 `API_PORT` / `WEB_PORT` 避免影响无关服务。
7. 首次并行验收中 Next.js 遇到一次 `.next` 内部缓存不一致；删除构建缓存后重跑通过。CI 应从干净 checkout/build cache 开始。

## 6. 架构、契约与数据影响

- 架构：确认 Control Plane、Managed Runtime、Governance Harness Services、Executor Adapter 和 Workspace Presentation Boundary 的主权边界。
- 契约：当前只确认 Presentation 语义原则；字段、OpenAPI、Pydantic 和 TypeScript contract 仍须在 Phase 1/2 验证后冻结。
- 数据：只复用重构基线 revision 定义的账号和 Workspace ownership 表；旧 Runtime/Workflow/Tool/Approval/Audit 表不进入新主路径。
- 迁移：后续 Runtime 数据对象必须通过新增 Alembic revision 建立，不得修改首个基线 revision 的历史语义。

## 7. 最终结论

Gate 0 的架构、代码、数据、文档和运行基线均已建立，旧 Mock、Preview 和阶段标记不会静默驱动正式路径。已知技术债务不构成 Phase 1 的架构阻塞。

正式结论：`accepted`。
