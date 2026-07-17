# Phase 2 实施方案与可执行 Backlog

更新时间：2026-07-17

## 1. 目标与边界

Phase 2 用完全隔离、无真实副作用的 Mock Interaction Runtime 验证 Customer Support 产品闭环，并冻结 `workspace-presentation-v1` 工程契约。

本阶段允许：

- 内存态 Mock Task、Interaction、Result 和恢复状态机。
- 默认关闭的 Mock Workspace API composition root。
- Production `ApiWorkspaceTaskRepository` 与 Preview/Test `MockWorkspaceTaskRepository`。
- 确定性 Presentation Projector。
- OpenAPI、Pydantic、TypeScript View Model 和共同 contract tests。

本阶段禁止：

- LLM、真实 Runtime、Executor、Tool、Browser 或外部系统调用。
- 写入真实 Runtime 表、业务表或产生任何真实副作用。
- production code import mock fixture、mock repository 或 mock runtime。
- React 组件解释 Runtime DTO、选择数据源或维护另一套状态映射。

## 2. 目标架构

```text
Production route composition root
  -> ApiWorkspaceTaskRepository
  -> versioned Workspace Presentation API
  -> Presentation Projector
  -> Mock Runtime provider（仅显式开关启用；默认不存在）

Preview/test composition root
  -> MockWorkspaceTaskRepository
  -> isolated in-memory scenario state

Reusable Workspace surface
  -> WorkspaceTaskRepository Interface
  -> workspace-presentation-v1 TypeScript View Model
```

后端的 Mock Runtime 只产生内部 DTO。所有 API response 必须先经过 Presentation Projector；route 只做认证、参数交付、错误转换和序列化。

## 3. Mock 闭环状态机

```text
submit
  -> needs_context
  -> provide context
      -> needs_approval
          -> approve -> completed -> succeeded result
          -> reject  -> cancelled -> cancelled result

任何非终态 -> cancel -> cancelled result

failure scenario
  -> failed + error_recovery
  -> retry -> needs_context -> 可重新进入主链路
  -> cancel -> cancelled result
```

附件只记录用户提供的 reference metadata，不上传文件、不写 Storage。Approval 只验证产品语义，不创建真实治理对象或外部 follow-up。

## 4. 冻结契约

契约名：`workspace-presentation-v1`。

API 路径：

```text
GET  /api/workspaces/{workspace_id}/task-view
POST /api/workspaces/{workspace_id}/tasks
POST /api/tasks/{task_id}/interactions/{interaction_id}/responses
POST /api/tasks/{task_id}/commands/retry
POST /api/tasks/{task_id}/commands/cancel
GET  /api/tasks/{task_id}
GET  /api/tasks/{task_id}/result
```

兼容规则：

- 新增可选字段允许保持 v1。
- 删除、重命名、改变语义、改变可空性或收窄枚举必须进入新版本或提供迁移层。
- API 只返回 Presentation View Model；禁止暴露 RuntimeInvocation、ToolCall、WorkflowRun、StepRun、Executor event 或内部幂等信息。
- 错误统一返回稳定 `code / message / retryable / details` envelope。

## 5. Composition Root

- Frontend production root 只能构造 `ApiWorkspaceTaskRepository`。
- Frontend preview/test root 才能构造 `MockWorkspaceTaskRepository`。
- Backend production root 不注册 Workspace Mock API。
- Backend mock root 仅在 `ENABLE_MOCK_WORKSPACE_API=true` 时注册相同版本化 API；默认值必须为 `false`。
- 可复用 Workspace surface 和 components 不读取环境变量，不包含 `isMock` 分支。

## 6. TD-04 / TD-06 决策

### TD-04：project / workspace

- 用户产品、公开 API、Presentation Contract 和未来 Runtime scope 统一使用 `workspace`。
- `project` 不作为 `workspace` 的公开别名，也不进入 v1 endpoint 或 View Model。
- 已移除的历史 `projects` 表不恢复；Phase 2 的 `workspace_id` 是逻辑产品 scope，不在本阶段引入新的持久化容器表。
- Phase 3 若需要持久化 Workspace，新增前置 Alembic revision 和 `workspaces` 模型；不得修改既有基线 migration。

### TD-06：dev.sh 端口清理

- 默认只终止 PID 文件记录且仍能验证属于 AstraOS 当前服务命令的进程。
- 端口被未知进程占用时输出 PID、命令和处理建议后退出。
- 只有显式设置 `ASTRAOS_FORCE_PORT_CLEANUP=true` 才允许清理未知占用者。
- 增加 shell-level 自动测试覆盖 owned、unknown 和 force 三类行为。

## 7. 可执行 Backlog

### P2-01 启动与文档

- [x] 创建 `codex/phase-2-mock-contract` 分支。
- [x] 将唯一阶段状态更新为 `in_progress`。
- [x] 写明 Phase 2 实施方案、状态机、契约与禁止项。

### P2-02 Contract Surface

- [x] 将冻结后的 View Model 与 command/input/error 类型迁入 `packages/shared`。
- [x] 建立 `WorkspaceTaskRepository` Interface。
- [x] 定义兼容规则和 `workspace-presentation-v1` 标识。

### P2-03 Repository 与前端闭环

- [x] 实现 production `ApiWorkspaceTaskRepository`。
- [x] 实现隔离 `MockWorkspaceTaskRepository`。
- [x] 建立 production / preview composition roots。
- [x] 将 Composer、Interaction、retry、cancel、result/failure recovery 接到 Repository。
- [x] 确保正式组件不 import mock、不选择数据源。

### P2-04 Backend Mock Runtime 与 Projector

- [x] 定义 Mock 内部 Task / Interaction / Result DTO 和状态机。
- [x] 实现 submit、context、approve/reject、retry/cancel、result/failure recovery。
- [x] 实现确定性 Presentation Projector 与 mapping tests。
- [x] 建立默认关闭的 Mock API composition root。

### P2-05 Contract Freeze 与测试

- [x] 建立 Pydantic schemas 和正式 endpoints。
- [x] 冻结 OpenAPI artifact。
- [x] 建立共享 contract fixtures。
- [x] 让 Mock/API Repository 运行同一套 contract tests。
- [x] 自动验证 TypeScript、Pydantic、OpenAPI 字段、枚举、可空性和错误 envelope。
- [x] 把 contract tests 加入本地脚本与 CI。

### P2-06 Gate 2 前债务

- [x] 冻结 TD-04 命名决策。
- [x] 实现并测试 TD-06 安全端口归属判断。
- [x] 更新相关基线文档，避免旧状态或旧术语误导。

### P2-07 Gate 2 验收

- [x] 运行 docs/baseline、lint、typecheck、build、web contract tests、API tests、OpenAPI freeze check。
- [x] 审计 production/mock import 和 `isMock` 等价分支。
- [x] 验证关闭开关后 Mock API 不存在。
- [x] 验证删除 Mock 实现不会要求修改 production component/API repository/contract。
- [ ] 新增 commit-bound `GATE_2_ACCEPTANCE.md`；只有全部通过后才把 Phase 2 改为 `accepted`。

## 8. Gate 2 证据要求

Gate 2 验收记录至少包含：

- 当前分支、验收 commit 与工作区状态。
- Customer Support 主链路、reject、cancel、failure/retry 的自动测试证据。
- Mock/API Repository 共同 contract suite 结果。
- Projector mapping coverage 与 OpenAPI freeze 结果。
- production/mock import 审计结果。
- TD-04、TD-06 关闭证据。
- 未接入真实 Runtime、Tool、外部系统和真实副作用的边界声明。
