# Gate 0 验收清单

更新时间：2026-07-16

本文件是正式验收前的可执行清单，不是 `accepted` 验收记录。完成实现提交后，应补充对应 commit、稳定证据链接和最终 `accepted / rejected / superseded` 结论。

## 验收元数据

- 验收日期：待正式验收填写
- 对应 commit：待实现提交后填写
- 验收人：待填写
- 验收结论：待填写

## Gate 逐项证据

| Gate | 当前证据 | 正式验收动作 |
| --- | --- | --- |
| 文档之间不存在架构主权冲突 | `REBUILT_ENGINEERING_BASELINE.md` 第 1 节 | 复核五份权威文档及辅助文档定位 |
| 所有重构前核心资产都有处置结论 | 同文档第 4 节 keep/migrate/reference/delete 清单 | 对照 `git ls-files` 和未跟踪核心资产复核 |
| 正式代码不被旧 Mock、Preview 或阶段标记驱动 | 正式 Workspace 已去除本地任务状态；Preview 默认 404；`pnpm baseline:check` | 在干净 checkout 运行基线检查、lint、typecheck、build |
| 能回答真实入口、数据源和正式契约 | 同文档第 2 节 | 由验收人从 README 和代码入口独立核对 |
| Phase 1 无未决架构依赖 | 同文档第 3、5、7 节 | 逐项确认目录边界、数据策略和 backlog 可执行 |

## 自动测试

正式验收至少记录：

```text
pnpm baseline:check
pnpm lint
pnpm typecheck
pnpm --filter @astraos/web build
cd services/api && .venv/bin/pytest
```

2026-07-16 工作树验证结果：

| 检查 | 结果 |
| --- | --- |
| `pnpm baseline:check` | 通过 |
| `pnpm lint` | 通过 |
| `pnpm typecheck` | 通过 |
| `pnpm --filter @astraos/web build` | 通过 |
| `cd services/api && .venv/bin/alembic upgrade head` | 通过 |
| `cd services/api && .venv/bin/pytest` | 14 passed；1 个第三方 `passlib`/Python 3.13 deprecation warning |

这些结果用于准备验收；正式记录仍须在对应 commit 上重跑或确认。

## 演示场景

1. 登录并进入真实 Workspace，只能看到 Auth/Project 数据和未接入任务契约的明确空态。
2. 未设置 `ENABLE_WORKSPACE_PREVIEWS=true` 时访问 `/workspace/phase1-preview` 返回 404。
3. 设置开关后 Preview 可访问，但删除 `apps/web/src/mock` 不影响正式 Workspace 的 import graph。
4. 搜索生产源码，不存在代码拥有的 Phase 状态常量、本地 Task demo 或 mock import。

## 已知限制

- Task Presentation View Model、Repository、Projector 和正式 Task API 尚未实现，分别属于 Phase 1/2。
- 当前 `projects` 表承担 Workspace ownership；不在 Phase 0 做破坏性重命名。
- Preview 是参考资产，不是 Gate 1 验收证据。
- Gate 0 未绑定实现 commit 前不得更新为 `accepted`。
