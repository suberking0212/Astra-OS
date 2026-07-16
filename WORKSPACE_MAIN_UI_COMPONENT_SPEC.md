# Workspace 主界面组件辅助规范

更新时间：2026-07-16

本文档是 Phase 1/2 的组件拆分辅助规范，不描述当前页面已经具备的 Task Runtime 能力，也不覆盖以下权威文档：

- `docs/Chinese/mvp/ARCHITECTURE_BASELINE.md`
- `docs/Chinese/mvp/MVP_SCOPE_AND_LONG_TERM_ROADMAP.md`
- `docs/Chinese/mvp/TASK_PRESENTATION_CONTRACT.md`
- `docs/Chinese/mvp/WORKSPACE_VISUAL_BASELINE.md`
- `docs/Chinese/mvp/PHASED_ENGINEERING_DELIVERY_PLAN.md`

实施标记：现有 Auth / Workspace 骨架为 `[CURRENT]`；本文档的组件拆分和 Preview 工作为 `[MVP-P1]`，Repository / View Model 正式冻结为 `[MVP-P2]`。Approval、takeover、authentication 等组件名只表示 Presentation 能力边界：真实 Approval 属于 `[MVP-P4]`，takeover / Human Work 和外部 authentication 流程属于 `[MVP-CONTRACT]` 或 `[DEFERRED]`。具体范围以 `MVP_SCOPE_AND_LONG_TERM_ROADMAP.md` 为准。

## 1. 当前真实状态

当前正式 Workspace 只读取 Auth 和 Project API。详情页显示 Workspace 身份、明确的 Task unavailable 状态和禁用的 Task Composer。

正式页面当前不具备：

- Task 提交。
- Interaction、Approval 或恢复。
- Runtime 进度。
- TaskResult。
- Model / Executor 选择或 trace 展示。

相关源码：

- `apps/web/src/components/workspace/workspace-detail.tsx`
- `apps/web/src/components/workspace/assistant-rich-content.tsx`
- `apps/web/src/styles/globals.css`

## 2. 组件依赖边界

正式组件只能消费 Presentation View Model 和 Repository Interface：

```text
Workspace Route / Composition Root
  -> WorkspaceTaskRepository
  -> WorkspaceTaskView / TaskProgressView / InteractionView / ResultView
  -> Workspace Components
```

禁止组件直接消费或解释：

- TaskDecision。
- RuntimeInvocation。
- WorkflowRun / StepRun。
- ToolCall。
- Executor session / event / trace。
- ApprovalRequest / PermissionGrant。
- Runtime schema、policy key 或内部 enum。

Mock、fixture 和 Preview 只能由专用 composition root 装配，不能被正式页面或组件导入。

## 3. Workspace Shell

可保留当前双栏、全高、沉浸式 Workspace 视觉骨架：

- Sidebar：Workspace 导航、当前 Workspace、账号和退出。
- Topbar：Workspace 身份和少量全局动作。
- Main Surface：Task-first 内容区域。
- Composer Area：正式契约接入前保持 unavailable；接入后由 Repository 提交 Task。

现有 `agent-*` CSS 类名是历史样式命名，不代表产品应展示 Agent、Harness、模型循环或内部 Thinking。

## 4. Phase 1 目标组件

组件拆分围绕：

```text
TaskComposer
ActiveTask
TaskProgress / TaskTimeline
NeedsAttention
InteractionRenderer
Result / History
WorkspaceUnavailable
WorkspaceLoading
WorkspaceError
```

公开 props 只能使用 Workspace View Model，不得使用 Runtime DTO。

## 5. InteractionRenderer

Presentation Projector 将 Runtime `schema / payload` 转成 `InteractionView.fields / options / actions`。前端统一按以下字段渲染：

```text
kind / fields / options / actions / riskLevel
```

第一版通用映射：

```text
input           -> schema form
selection       -> option picker
confirmation    -> confirmation card
approval        -> approval card
result          -> result view
takeover        -> supervision / takeover panel
progress        -> business timeline
error_recovery  -> recovery choices
file_request    -> file upload
authentication  -> auth handoff
```

`presentationHint` 只能影响展示建议，不能命令前端打开指定组件。

## 6. 内容与可见性

可以展示：

- 用户意图和系统理解摘要。
- 业务进度与等待原因。
- 需要补充、选择、确认或审批的事项。
- 风险、影响、失败恢复和最终结果。
- 经过脱敏和确定性映射的业务内容。

禁止展示：

- 模型名称作为任务主路径元数据。
- Agent loop、Thinking、chain-of-thought 或 raw prompt。
- RuntimeInvocation、ToolCall、WorkflowRun、StepRun。
- Browser selector、MCP trace、stack trace、cookie 或 token。
- 模型或 Executor 生成的组件名、按钮文案、布局和最终 UI 文案。

如果复用旧 `agent-thinking-*` 样式，只能承载确定性的“任务理解摘要”或“业务进度摘要”，组件和产品文案不得命名为 Thinking。

## 7. Result 与富文本

`assistant-rich-content.tsx` 只能作为 `ResultView` 中受支持业务内容的 renderer 候选。它不能直接渲染 Executor 原始文本或 trace。

Result 至少表达：

- 结果摘要。
- 创建或更新的业务对象。
- 部分成功与未完成事项。
- 失败原因。
- 下一步建议。

## 8. 实现和验收规则

- Phase 1 可以建立组件边界和 View Model 草案，但不宣称字段冻结。
- Phase 2 经 Mock 闭环、OpenAPI、Pydantic、TypeScript 和 contract tests 验证后冻结契约。
- Needs Attention、Approval、Result 和 History 属于正式目标组件，不需要另立一份替代设计才能开始 Phase 1 拆分。
- 正式 Workspace 不得通过环境变量、`if (isMock)` 或动态 import 选择 Mock 数据源。
- 用户无需查看 Console、Runtime trace 或内部对象即可理解当前状态和下一步。
