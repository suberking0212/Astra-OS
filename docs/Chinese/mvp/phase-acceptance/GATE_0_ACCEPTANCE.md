# Gate 0 原验收记录（已撤销）

验收日期：2026-07-16

当前记录状态：`superseded`

撤销原因：完整文档审计确认产品定位、Account/Control Plane 归属、Governance/Managed Runtime/Audit 主权、`external_agent` RuntimeInvocation、ToolAction Executor 分类和 Presentation View Model 字段冲突在对应实现 commit 中已经存在，因此原“文档之间不存在架构主权冲突”的结论不成立。本文件保留原验收证据和技术债务，只作为历史审计记录。

后续基线说明：当前正式基线已经进一步收口为“单一 `/workspace` shell + Auth API + `users` / `email_verification_codes` 双表数据基线”；原记录中的 workspace/project 容器管理语义不再代表当前 production 设计。

## 1. 验收元数据

- Phase：Phase 0 — Rebuild Baseline
- 对应实现 commit：`d1c3e21f686c292a05988d2b48595bc81eb41504`
- 分支：`workspace-main`
- 原验收结论：`accepted`
- 当前记录状态：`superseded`
- 下一阶段状态：Phase 1 重新阻塞，等待 Gate 0 重新验收

## 2. Gate 逐项结论

| Gate 0 条件 | 结论 | 证据 |
| --- | --- | --- |
| 文档之间不存在架构主权冲突 | 原通过，后撤销 | 权威顺序虽然已经定义，但验收时未识别多个当前文档中的实际语义冲突；该条件由后续纠偏和重新验收重新验证 |
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

| ID | 技术债务 | 预期处理阶段 | 完成标准 | Gate 约束 |
| --- | --- | --- | --- | --- |
| TD-01 | 当前没有 CI 自动执行 baseline、lint、typecheck、build 和 pytest；现阶段证据来自本地固定 commit 验证 | Phase 1 | CI 在干净 checkout 上自动执行五类检查，失败时阻止合并；Phase 2 再加入 contract tests | Gate 1 前完成基础 CI；Gate 2 前补齐 contract tests |
| TD-02 | `apps/web/src/styles/globals.css` 体积较大，Workspace 组件和样式耦合 | Phase 1 | Task Composer、Active Task、Needs Attention、Interaction、Result/History 的组件和样式边界完成拆分，不再继续向单一全局文件堆叠 Workspace 状态样式 | Gate 1 前完成 |
| TD-03 | Preview 的 View 类型仍位于 Mock fixture | Phase 1 | View Model 草案迁移到正式 `features/workspace/contract`，Preview/Mock 与正式组件只共同依赖公开 contract types；Phase 2 再验证并冻结字段 | Gate 1 前完成类型迁移；Gate 2 前完成契约冻结 |
| TD-04 | 数据库存储对象命名为 `projects`，产品语义使用 Workspace | Phase 2 决策；必要时 Phase 3 迁移 | Gate 2 冻结 API 前明确 `project` 与 `workspace` 的长期映射和兼容规则；若决定改表，通过 Phase 3 前置 Alembic revision 迁移，不直接修改基线 revision | Gate 2 前必须完成命名决策；若需迁移则阻塞 Phase 3 正式实现 |
| TD-05 | Python 3.12 测试存在 `passlib` 对 `crypt` 的弃用警告；当前支持范围已明确限制为 Python 3.11/3.12，Python 3.13 暂不支持 | Phase 1 | 升级或替换密码哈希依赖，使测试不再依赖即将移除的标准库能力；完成后再评估 Python 3.13 支持 | 最迟 Gate 3 前完成；目标在 Gate 1 前清理 |
| TD-06 | `scripts/dev.sh` 的端口兜底清理可能终止占用相同端口的无关进程 | Phase 1 | 优先只清理由 AstraOS PID 文件和命令特征确认的进程；遇到无法确认归属的端口占用时给出诊断并退出，除非用户显式开启强制清理 | 不单独阻塞 Gate 1，但必须在 Gate 2 前完成 |
| TD-07 | Next.js 曾出现一次 `.next` 内部缓存不一致，清理缓存后重跑通过 | Phase 1 | TD-01 的 CI 从干净构建目录连续稳定通过；本地 build 命令或脚本明确处理损坏缓存，不依赖人工判断 | Gate 1 前完成并通过 CI 证明 |

债务治理规则：对应 Gate 标记为“必须完成”的项目未关闭时，该 Gate 不得 `accepted`；债务延期必须在新的 Gate 验收记录中说明原因、风险和新的最晚处理阶段，不能静默后移。

## 6. 架构、契约与数据影响

- 架构：确认 Control Plane、Managed Runtime、Governance Harness Services、Executor Adapter 和 Workspace Presentation Boundary 的主权边界。
- 契约：当前只确认 Presentation 语义原则；字段、OpenAPI、Pydantic 和 TypeScript contract 仍须在 Phase 1/2 验证后冻结。
- 数据：只复用重构基线 revision 定义的账号和 Workspace ownership 表；旧 Runtime/Workflow/Tool/Approval/Audit 表不进入新主路径。
- 迁移：后续 Runtime 数据对象必须通过新增 Alembic revision 建立，不得修改首个基线 revision 的历史语义。

## 7. 最终结论

Gate 0 的架构、代码、数据、文档和运行基线均已建立，旧 Mock、Preview 和阶段标记不会静默驱动正式路径。已知技术债务不构成 Phase 1 的架构阻塞。

原正式结论为 `accepted`，当前已撤销并标记为 `superseded`。新的 Gate 0 结论只能由独立重新验收记录给出。
