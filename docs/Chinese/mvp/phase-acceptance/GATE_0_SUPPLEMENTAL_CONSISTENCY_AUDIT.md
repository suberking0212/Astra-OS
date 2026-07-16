# Gate 0 补充一致性审计记录

审计日期：2026-07-16

## 1. 审计元数据

- Phase：Phase 0 — Rebuild Baseline Supplemental Consistency Audit
- 审计类型：既有 Gate 0 的补充文档与契约审计，不是新的 Phase 验收
- 分支：`workspace-main`
- 审计基准 HEAD：`2c632aecd612f043737d6504562f7df48fb0f0d8`
- 审计对象：上述 HEAD 加本轮未提交的文档与检查脚本修改
- Commit 绑定：`pending`；本轮修改提交后必须回填最终 commit
- 当前审计状态：`provisional_pass`
- Gate 状态变化：无；Phase 0 保持 `accepted`，Phase 1 保持 `not_started`
- 前一正式记录：`GATE_0_REACCEPTANCE.md`

`provisional_pass` 只表示当前工作树已经完成补充审计并通过现有验证，不构成新的正式 Gate accepted 证据。只有回填包含本轮修改的最终 commit，并在该 commit 上重新执行本记录列出的验证后，本记录才能改为 `accepted`。

## 2. 审计触发原因

Gate 0 重新验收后，再次进行全量文档交叉检查时发现：

- HumanExecutor 已被定义为正式逻辑 Executor，但 `RuntimeInvocation` 没有 `human` 类型。
- Direct Human Routing 与 Human Takeover 没有形成两条明确路径。
- Approval 与 HumanExecutor 的边界可能被误读为“所有人工审批都进入人工执行”。
- 主架构的 MVP 模块清单遗漏 Governance 内部模块，与阶段计划不一致。
- Foundation Queue 在主架构、README、Runtime 和 Harness 中的存在性与当前部署状态表述不一致。
- `InteractionKind` 和 `InteractionAction` 在多份契约中被引用但没有统一定义。
- 原自动检查只验证固定字符串，没有比较重复契约的实际结构。

这些问题不改变 AstraOS 的产品定位、系统主权、当前工程入口、数据基线或 Phase 0 实现结果，但会影响后续 Phase 对 Runtime、Presentation、Governance 和 HumanExecutor 的理解，因此需要独立补充审计。

## 3. 修复结论

| 审计项 | 结论 | 统一口径 |
| --- | --- | --- |
| HumanExecutor invocation | 通过 | `RuntimeInvocation(invocation_type = human)` 是进入 HumanExecutor 的标准执行契约 |
| Direct Human Routing | 通过 | TaskDecision 可以从任务开始直接选择 `human_executor`，不要求先执行自动 Executor |
| Human Takeover | 通过 | 既有 Executor 运行中升级给人工；需要用户参与时使用 `InteractionRequest(kind = takeover)` |
| 自动人工升级 | 通过 | 策略可自动决定时直接重新决策，不创建没有用户动作的 InteractionRequest |
| Approval 边界 | 通过 | 人工只批准原 Executor 动作时仍属于 Governance Approval，不进入 HumanExecutor |
| Runtime Adapter | 通过 | HumanExecutor 已加入 Adapter 列表和工程对象映射 |
| MVP Governance | 通过 | MVP 必须落地 Control Plane、Governance、Managed Runtime、Executor Adapter 四类逻辑模块 |
| Queue | 通过 | Queue 是按需启用的 Foundation 能力，不属于 Phase 0 当前本地启动依赖 |
| Interaction 基础类型 | 通过 | Presentation、Runtime、Harness 统一定义 `InteractionKind` 和 `InteractionAction` |
| 重复 Interaction contract | 通过 | 三份文档中的 InteractionRequest / InteractionResponse 结构一致 |
| 历史记录边界 | 通过 | 原重新验收记录只证明其绑定 commit；新增语义不被倒写为旧 commit 已有内容 |

## 4. Phase 影响审计

| Phase | 影响 | 结论 |
| --- | --- | --- |
| Phase 0 | 架构、权威文档、自动一致性检查和历史证据边界 | 已修复；不改变工程与数据基线 |
| Phase 1 | takeover、approval 和用户可见 Interaction 语义 | 已在 Phase 1 启动前统一 |
| Phase 2 | InteractionKind、InteractionAction、Request / Response 冻结输入 | 已统一；仍须在 Gate 2 经 OpenAPI/Pydantic/TypeScript contract tests 验证 |
| Phase 3 | RuntimeInvocation、Runtime Adapter、最低 Governance 和可选 Queue | 已形成稳定设计输入；不要求 HumanExecutor 进入 Phase 3 production 主路径 |
| Phase 4 | Direct Human Routing、Human Takeover、HumanExecutor 与 Approval 的语义边界 | HumanExecutor 作为 `[MVP-CONTRACT]` 保留；Gate 4 实现真实 Approval 和受治理写操作，不要求真实 Human Work assignment |
| Phase 5 | External Agent 触发人工升级仍由 Managed Runtime 重新决策 | 主权边界不变 |

## 5. 自动与人工验证

当前工作树已执行：

| 验证 | 当前结果 |
| --- | --- |
| `pnpm docs:check` | 通过 |
| `pnpm baseline:check` | 通过 |
| `node --check scripts/check-document-consistency.mjs` | 通过 |
| `git diff --check` | 通过 |
| InteractionKind / InteractionAction 跨文档比较 | 通过 |
| InteractionRequest / InteractionResponse 跨文档精确比较 | 通过 |
| TaskResult 跨文档字段比较 | 通过 |
| WorkspaceTaskView 跨文档比较 | 通过 |
| RuntimeInvocation taxonomy 与 Harness supported types 比较 | 通过 |
| 当前入口、源码路径和工程基线核对 | 通过 |
| Human routing / Approval / Takeover 人工语义审计 | 通过 |
| Governance / Queue / Phase 顺序人工语义审计 | 通过 |

由于本轮只修改文档和文档检查脚本，没有修改 Web、API、ORM、Alembic 或运行配置，因此不重复把旧 commit 的 build、pytest、迁移和本地启动结果声明为本轮新证据。正式绑定 commit 后至少必须重跑 `pnpm docs:check`、`pnpm baseline:check`、检查脚本语法和 `git diff --check`；若提交前出现代码或运行配置变化，还必须补充对应工程验证。

## 6. Gate 0 影响结论

本轮问题证明原 Gate 0 重新验收的文档一致性检查范围仍不完整，因此原记录中的绝对性表述已经增加后续审计说明。但本轮修复没有改变：

- AstraOS 的产品定位。
- Control Plane、Governance Harness Services、Managed Runtime 和 Executor 的系统主权。
- Workspace Presentation Boundary。
- 当前 Auth / Project production 路径。
- PostgreSQL 三表数据基线。
- Phase 0 的工程交付物。
- Phase 1 尚未开始的事实。

因此，本补充审计不撤销 Gate 0，不改变 Phase 状态。它补充并收紧 Gate 0 的文档一致性证据。

## 7. 当前结论与正式化条件

当前结论：`provisional_pass`。

正式化条件：

1. 将本轮文档和 `scripts/check-document-consistency.mjs` 修改提交到独立 commit。
2. 将本记录的 Commit 绑定从 `pending` 更新为该 commit 完整 SHA。
3. 在该 commit 上重新执行第 5 节要求的验证。
4. 将当前审计状态更新为 `accepted`，并记录最终命令结果。

在完成上述条件前，本记录是可审计的补充检查记录，但不是新的正式 Gate accepted 证据。
