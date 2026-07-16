# Gate 0 重新验收记录

验收日期：2026-07-16

后续审计说明：本记录只证明 commit `0953b8c62b03922e581d9374d6f51ebf0f37798b` 在当次重新验收范围内通过。之后的再次审计发现 HumanExecutor 缺少 `human` RuntimeInvocation、Direct Human Routing 与 Human Takeover 未明确区分、MVP Governance 清单和可选 Queue 清单仍有表述缺口。后续文档已补齐这些语义并扩展 `pnpm docs:check`；这些补充不改变 Gate 0 的工程、数据或系统主权结论，也不应被误读为已经存在于该历史 commit 中。

当前基线说明：当前 production 基线已进一步调整为“单一 `/workspace` shell + Auth API + `users` / `email_verification_codes` 双表数据基线”；本历史记录中的 `projects` / workspace 容器管理语义仅用于描述当次重新验收时点，不代表当前正式实现。

## 1. 验收元数据

- Phase：Phase 0 — Rebuild Baseline Corrective Reacceptance
- 对应纠偏基线 commit：`0953b8c62b03922e581d9374d6f51ebf0f37798b`
- 分支：`workspace-main`
- 前一验收记录：`GATE_0_ACCEPTANCE.md`，状态 `superseded`
- 验收结论：`accepted`
- 下一阶段状态：Phase 1 解除阻塞，回到 `not_started`

## 2. 纠偏范围

本次重新验收针对原 Gate 0 未识别的文档语义冲突，完成以下修复：

- AstraOS 统一定义为 Enterprise AI Operating System；AI Employee 统一定义为企业业务责任与治理对象。
- Account Service 固定归属 API Layer，Control Plane 不再重复持有 User / Account 主权。
- Governance Harness Services、Managed Runtime、Audit / Observability / Evaluation 的逻辑主权重新对齐。
- `RuntimeInvocation` 正式支持受控 `external_agent` 类型。
- `tool_action` 固定为单次受治理 invocation / ToolActionExecutor adapter，不再定义为逻辑 Runtime 类型。
- `InteractionView` 统一按 `kind / fields / options / actions / riskLevel` 渲染，Runtime schema 由 Presentation Projector 转换。
- Runtime 与 Harness 的 TaskResult、ExecutorCapability 和 ModelCapability 定义对齐。
- Customer Support Employee 明确先于 External Agent POC 落地。
- 旧 UI 组件说明被重写为辅助规范；旧临时计划与 Agent-first HTML Preview 改为明确的 `superseded` 占位。
- Python 支持范围在 README、启动脚本、pyproject 和 lockfile 中统一为 3.11/3.12。
- 新增自动文档一致性检查，并纳入 `pnpm baseline:check`。

## 3. Gate 逐项结论

| Gate 0 条件 | 结论 | 证据 |
| --- | --- | --- |
| 文档之间不存在架构主权冲突 | 通过 | `pnpm docs:check` 检查产品定位、Account 归属、RuntimeInvocation、Executor 分类、Presentation 字段、TaskResult、交付顺序和历史文档边界；人工交叉审计同步通过 |
| 所有重构前核心资产都有明确处置结论 | 通过 | `REBUILT_ENGINEERING_BASELINE.md` 保留 keep/migrate/reference/delete 结论，并更新 UI spec、HTML Preview、历史临时计划和 vendor 资产状态 |
| 正式代码不会被旧 Mock、Preview 或阶段标记静默驱动 | 通过 | `pnpm baseline:check` 通过；正式 Workspace 不 import mock，Preview 默认返回 404 |
| 团队能回答真实入口、真实数据源和正式契约分别在哪里 | 通过 | README 与重构基线明确 Web/API 入口、三张 PostgreSQL 基线表、Presentation 草案与 Phase 2 冻结边界 |
| Phase 1 不再依赖尚未决定的架构问题 | 通过 | 产品定位、系统主权、Runtime invocation、Executor 分类、View Model 字段和交付顺序均已形成唯一口径；Phase 1 backlog 可直接执行 |

## 4. 自动与运行验证

所有重新验收命令均针对纠偏基线 commit `0953b8c62b03922e581d9374d6f51ebf0f37798b` 的内容执行。

| 验证 | 结果 |
| --- | --- |
| `pnpm docs:check` | 通过；文档权威、契约和历史边界一致 |
| `pnpm baseline:check` | 通过；工程边界与文档一致性均通过 |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm --filter @astraos/web build` | 通过；Next.js production build 完成 |
| `cd services/api && uv lock --check` | 通过 |
| `cd services/api && .venv/bin/alembic upgrade head` | 通过 |
| `cd services/api && .venv/bin/pytest` | 14 passed；保留一个已记录的 `passlib`/`crypt` deprecation warning |
| `bash -n scripts/dev.sh` | 通过 |
| `PYTHON_BIN=services/api/.venv/bin/python ./scripts/dev.sh` | 通过；PostgreSQL、Qdrant、迁移、FastAPI 和 Next.js 均成功启动 |
| `GET http://localhost:8000/health` | HTTP 200 |
| `GET http://localhost:3000/workspace` | HTTP 200 |
| `GET http://localhost:3000/workspace/phase1-preview`（默认配置） | HTTP 404 |
| `git diff --check` | 通过 |

## 5. 已知限制与技术债务

以下债务不阻塞重新验收，但继续受原 Gate 约束：

| ID | 当前状态 | Gate 约束 |
| --- | --- | --- |
| TD-01 | 尚无 CI 自动执行 baseline、docs、lint、typecheck、build 和 pytest | Gate 1 前完成基础 CI；Gate 2 前加入 contract tests |
| TD-02 | `globals.css` 体积较大，Workspace 组件和样式仍耦合 | Gate 1 前完成组件与样式边界拆分 |
| TD-03 | Preview View 类型仍位于 Mock fixture | Gate 1 前迁移正式 contract 草案；Gate 2 前冻结 |
| TD-04 | 数据表使用 `projects`，产品语义使用 Workspace | Gate 2 前完成长期命名决策；必要迁移阻塞 Phase 3 |
| TD-05 | Python 3.12 仍存在 `passlib`/`crypt` warning；支持范围已明确为 3.11/3.12 | 目标 Gate 1 前清理，最迟 Gate 3 前完成 |
| TD-06 | `scripts/dev.sh` 的端口兜底清理可能终止同端口无关进程 | Gate 2 前完成安全收敛 |
| TD-07 | Next.js 曾出现一次缓存不一致 | Gate 1 前由干净 CI 构建稳定性证明关闭 |

新增约束：后续修改产品定位、主权、RuntimeInvocation、Executor 分类、Presentation 字段、TaskResult、交付顺序或历史文档状态时，`pnpm docs:check` 必须通过；检查失败不得接受对应 Gate。

## 6. 架构、契约与数据影响

- 架构：没有改变主架构方向，只消除了从属文档中的错误归属和遗漏。
- 契约：确认 `external_agent` invocation、ToolAction adapter 定位、Interaction View 渲染字段和 TaskResult 状态；这些仍是 Phase 1 语义草案，Phase 2 前不宣称 OpenAPI/共享类型冻结。
- 数据：未修改 ORM、数据库表或 Alembic revision；真实数据基线仍为 `users`、`email_verification_codes`、`projects`。
- 代码：未修改 Auth、Project、Workspace production 数据路径；只新增文档检查并收紧开发环境 Python 版本验证。
- 历史：原 Gate 0 验收记录保留但标记为 `superseded`，不再作为当前 accepted 证据。

## 7. 最终结论

Gate 0 的工程基线继续有效，当次重新验收范围内识别的文档冲突已经纠正，陈旧内容已封存，自动文档一致性检查已建立。Phase 0 可以重新标记为 `accepted`，Phase 1 解除阻塞并回到 `not_started`。后续识别出的 Human 路由、Governance 清单和 Queue 清单缺口按本记录开头的后续审计说明处理。

正式结论：`accepted`。
