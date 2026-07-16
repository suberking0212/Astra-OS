# Workspace 主界面组件说明

本文档记录当前 Workspace 详情页主界面的主要区域、组件设计和显示样式。

相关源码：

- `apps/web/src/components/workspace/workspace-detail.tsx`
- `apps/web/src/components/workspace/assistant-rich-content.tsx`
- `apps/web/src/styles/globals.css`

## 1. 全局 Workspace Shell

Workspace 详情页是一个全高双栏应用壳：

- 根节点：`main.agent-experience.agent-workspace-view`
- 页面网格：`section.agent-workspace`
- 左侧栏：`aside.agent-sidebar`，固定宽度 `296px`
- 主内容列：`section.agent-work-main`
- 主内容列分三行：顶部栏 `76px`、中间可滚动对话区、底部 composer 区

显示规则：

- 整体高度固定为 `100dvh`。
- 页面本身不滚动，中间 `agent-conversation` 承担纵向滚动。
- 背景使用现有深绿色渐变，不新增背景方案。
- 主内容列左右 padding 使用 `clamp(22px, 3vw, 48px)`。

样例代码：

```tsx
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="agent-experience agent-workspace-view">
      <section className="agent-workspace" aria-labelledby="workspace-title">
        <WorkspaceSidebar />
        <section className="agent-work-main">
          <WorkspaceTopbar />
          {children}
        </section>
      </section>
    </main>
  );
}
```

## 2. Sidebar

Sidebar 是固定在左侧的 Workspace 上下文导航区，不应表现成 dashboard 卡片。

结构组成：

- 品牌区
- Assistant inbox 入口
- 导航标签
- 当前任务入口
- Workspace 切换入口
- 用户信息与退出登录

显示样式：

- 宽度：`296px`
- 背景：`rgba(35, 37, 34, 0.98)`
- 右边框：`rgba(255, 255, 255, 0.07)`
- 主类名：`agent-sidebar`、`agent-sidebar-head`、`agent-brand`、`agent-inbox-card`、`agent-nav-area`、`agent-section-label`、`agent-task-item`、`agent-new-task`、`agent-profile`
- 文本过长时使用 `text-overflow: ellipsis`，不得撑开侧栏。

样例代码：

```tsx
import { Brain, ChevronRight, LogOut, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";

export function WorkspaceSidebar({
  userEmail,
  onSignOut,
}: {
  userEmail: string | null;
  onSignOut: () => void;
}) {
  return (
    <aside className="agent-sidebar" aria-label="Workspace navigation">
      <div className="agent-sidebar-head">
        <Link className="agent-brand" href="/workspace" aria-label="Astra Workspace">
          <div className="agent-brand-mark" aria-hidden="true" />
          <div className="agent-brand-name">
            <span className="agent-brand-title">Astra</span>
            <span className="agent-brand-subtitle">Workspace</span>
          </div>
        </Link>
      </div>

      <button className="agent-inbox-card" type="button">
        <span className="agent-inbox-name red-dot">
          <Sparkles className="icon" aria-hidden="true" />
          <span className="agent-inbox-copy">
            <strong>Astra Assistant</strong>
            <span className="agent-inbox-status">ready to help</span>
          </span>
        </span>
        <ChevronRight className="icon" aria-hidden="true" />
      </button>

      <div className="agent-nav-area">
        <p className="agent-section-label">
          <span>Scheduled Tasks</span>
          <ChevronRight className="icon" aria-hidden="true" />
        </p>
        <p className="agent-section-label">
          <span>Recent Tasks</span>
          <Search className="icon" aria-hidden="true" />
        </p>
        <button className="agent-task-item" type="button">
          <Brain className="icon" aria-hidden="true" />
          <span className="agent-task-item-text">Customer response work</span>
        </button>
      </div>

      <Link className="agent-new-task" href="/workspace">
        Workspaces
        <Plus className="icon" aria-hidden="true" />
      </Link>

      <div className="agent-profile">
        <div className="agent-profile-main">
          <span className="agent-profile-avatar">{userEmail?.[0]?.toUpperCase() ?? "A"}</span>
          <span className="agent-profile-name">{userEmail ?? "Account"}</span>
        </div>
        <button type="button" onClick={onSignOut} aria-label="Sign out">
          <LogOut className="icon" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
```

## 3. Topbar

Topbar 用于展示当前 Workspace 身份和少量全局动作。

结构组成：

- Workspace 标题按钮
- 标题左侧 icon
- 标题右侧 chevron
- 右侧动作组
- Share 按钮
- 当前任务状态 pill

显示样式：

- 根类名：`agent-work-top`
- 标题类名：`agent-task-title`
- 动作组类名：`agent-top-actions`
- 状态 pill 类名：`agent-credit-pill`、`agent-upgrade`
- Topbar 内容高度目标为 `60px`，位于 `76px` 的顶部行内。

样例代码：

```tsx
import { Brain, ChevronDown, Clock3, Share2 } from "lucide-react";

export function WorkspaceTopbar({ workspaceName }: { workspaceName: string }) {
  return (
    <header className="agent-work-top">
      <button className="agent-task-title" type="button" id="workspace-title">
        <Brain className="icon" aria-hidden="true" />
        {workspaceName}
        <ChevronDown className="icon" aria-hidden="true" />
      </button>

      <div className="agent-top-actions">
        <button type="button" aria-label="Share task">
          <Share2 className="icon" aria-hidden="true" />
        </button>
        <button className="agent-credit-pill" type="button" aria-label="Task status">
          <Clock3 className="icon" aria-hidden="true" />
          Ready
          <span className="agent-upgrade">Tasks</span>
        </button>
      </div>
    </header>
  );
}
```

## 4. 对话主区域

对话主区域是 Workspace 详情页中最主要的纵向内容流。

结构组成：

- `section.agent-conversation`
- 用户消息块
- assistant 运行信息区
- assistant 状态摘要行
- thinking 折叠区
- assistant 富文本回复区

显示规则：

- 宽度：`min(920px, 100%)`
- 在主内容列中水平居中。
- 自身负责纵向滚动。
- 底部 padding 需要给 composer 留出空间。
- 当前实现使用负 margin 让底部 composer 有悬浮/贴近效果；如果延续当前 shell 行为，可以保留，否则应整体重新设计。

样例代码：

```tsx
export function WorkspaceConversation({
  userIntent,
  updatedAt,
  modelName,
  children,
}: {
  userIntent: string;
  updatedAt: string;
  modelName: string;
  children: React.ReactNode;
}) {
  return (
    <section className="agent-conversation" aria-label="Task progress">
      <div className="agent-user-turn">
        <div className="agent-message-meta">
          <span>{updatedAt}</span>
          <span aria-hidden="true">·</span>
          <span>{modelName}</span>
        </div>
        <div className="agent-user-bubble">{userIntent}</div>
      </div>

      <div className="agent-run-feed workspace-task-surface">{children}</div>
    </section>
  );
}
```

## 5. 用户消息块

用户消息块右对齐，由一行小型 meta 信息和一个深色气泡组成。

使用类名：

- `agent-user-turn`
- `agent-message-meta`
- `agent-user-bubble`

显示样式：

- meta 文案小、弱化、横向排列。
- 用户气泡使用深色渐变、圆角、大字号和阴影。
- 气泡中只放用户意图，不放任务按钮、状态卡片或表单。

样例代码：

```tsx
export function UserTurn({
  text,
  timestamp,
  sourceLabel,
}: {
  text: string;
  timestamp: string;
  sourceLabel: string;
}) {
  return (
    <div className="agent-user-turn">
      <div className="agent-message-meta">
        <span>{timestamp}</span>
        <span aria-hidden="true">·</span>
        <span>{sourceLabel}</span>
      </div>
      <div className="agent-user-bubble">{text}</div>
    </div>
  );
}
```

## 6. Assistant 状态摘要行

Assistant 状态摘要行位于 assistant 回复栈顶部，用于轻量提示当前系统判断或下一步。

使用类名：

- `agent-run-line`
- `agent-thinking-summary`
- `agent-thinking-summary-copy`
- `agent-thinking-inline-chevron`

显示规则：

- 单行或短文本展示。
- 左侧使用小型 `Sparkles` icon。
- chevron 可表示存在可展开内容，但这一行不能变成重型卡片。

样例代码：

```tsx
import { ChevronDown, Sparkles } from "lucide-react";

export function AssistantStatusSummary({ text }: { text: string }) {
  return (
    <div className="agent-run-line agent-thinking-summary">
      <Sparkles className="icon" aria-hidden="true" />
      <span className="agent-thinking-summary-copy">
        <span>{text}</span>
        <ChevronDown className="icon agent-thinking-inline-chevron" aria-hidden="true" />
      </span>
    </div>
  );
}
```

## 7. Thinking 折叠区

Thinking 区是轻量的可折叠信息行，不是卡片。

结构组成：

- 外层：`agent-thinking-card`
- 单个区块：`agent-thinking-section`
- 折叠按钮：`agent-thinking-head agent-thinking-toggle`
- 标题行：`agent-thinking-title`
- 展开内容：`agent-thinking-panel`

显示样式：

- 背景透明。
- 文案弱化。
- icon 尺寸小。
- 展开内容只使用普通文本，不嵌套卡片。

样例代码：

```tsx
import { Brain, ChevronDown, Search, Sparkles } from "lucide-react";

type ThinkingState = {
  request: boolean;
  currentTask: boolean;
};

export function ThinkingSections({
  state,
  onToggle,
  userIntent,
  taskTitle,
  progressSummary,
  statusLabel,
}: {
  state: ThinkingState;
  onToggle: (key: keyof ThinkingState) => void;
  userIntent: string;
  taskTitle: string;
  progressSummary: string;
  statusLabel: string;
}) {
  return (
    <div className="agent-thinking-card">
      <section className="agent-thinking-section" aria-label="Task understanding">
        <button
          aria-controls="thinking-request-panel"
          aria-expanded={state.request}
          className="agent-thinking-head agent-thinking-toggle"
          type="button"
          onClick={() => onToggle("request")}
        >
          <div className="agent-thinking-title">
            <Search className="icon" aria-hidden="true" />
            <span>Understanding the request</span>
            <ChevronDown className="icon agent-thinking-inline-chevron" aria-hidden="true" />
          </div>
        </button>
        {state.request ? (
          <div className="agent-thinking-panel" id="thinking-request-panel">
            <p>{userIntent}</p>
          </div>
        ) : null}
      </section>

      <div className="agent-thinking-body">
        <section className="agent-thinking-section" aria-label="Current task">
          <button
            aria-controls="thinking-current-task-panel"
            aria-expanded={state.currentTask}
            className="agent-thinking-head agent-thinking-toggle"
            type="button"
            onClick={() => onToggle("currentTask")}
          >
            <div className="agent-thinking-title">
              <Brain className="icon" aria-hidden="true" />
              <span>{taskTitle}</span>
              <ChevronDown className="icon agent-thinking-inline-chevron" aria-hidden="true" />
            </div>
          </button>
          {state.currentTask ? (
            <div className="agent-thinking-panel" id="thinking-current-task-panel">
              <p>{progressSummary}</p>
            </div>
          ) : null}
        </section>

        <section className="agent-thinking-section" aria-label="Task status">
          <div className="agent-thinking-head">
            <div className="agent-thinking-title">
              <Sparkles className="icon" aria-hidden="true" />
              <span>Current status</span>
            </div>
            <span className="agent-task-step-status">{statusLabel}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
```

## 8. Assistant 富文本回复

Assistant 回复区是正文内容，不是聊天气泡。

使用类名：

- 外层：`agent-stream-response`
- Markdown 根节点：`assistant-rich-content`
- 可复制块：`assistant-copyable-block`
- 表格滚动容器：`assistant-table-scroll`
- 复制按钮：`assistant-copy-button`

支持内容：

- 段落
- 标题
- 列表
- 表格
- 行内数学公式
- 块级数学公式
- 代码块
- 图片
- 代码、表格、公式、图片的复制操作

样例代码：

```tsx
import { AssistantRichContent } from "@/components/workspace/assistant-rich-content";

const response = `
## Summary

AstraOS prepared the response and identified the next step.

| Item | Status |
| --- | --- |
| Reply draft | Ready |
| Follow-up | Needs confirmation |

Inline formula: $E = mc^2$

\`\`\`ts
const status = "ready";
\`\`\`
`;

export function AssistantResponse() {
  return (
    <section className="agent-stream-response" aria-label="Assistant response">
      <AssistantRichContent content={response} />
    </section>
  );
}
```

## 9. 紧凑 Timeline

当前紧凑 Timeline 位于 composer 上方。它只能作为紧凑的进度 disclosure，不应替代完整任务结果区。

使用类名：

- `agent-bottom-stack`
- `workspace-task-card workspace-task-card-wide workspace-timeline-card`
- `workspace-timeline-toggle`
- `workspace-timeline-meta`
- `workspace-plan-list`
- `agent-task-step`
- `agent-task-step-dot`
- `agent-task-step-content`
- `agent-task-step-heading`
- `agent-task-step-name`
- `agent-task-step-status`

显示规则：

- 宽度：`min(560px, 100%)`
- 深色玻璃质感紧凑面板。
- 内容可折叠。
- step dot 尺寸为 `18px`。
- step 文案必须短，并使用业务语言。

样例代码：

```tsx
import { ChevronDown } from "lucide-react";

type TimelineItem = {
  label: string;
  description: string;
  status: "succeeded" | "running" | "failed" | "";
  statusLabel: string;
};

export function CompactTimeline({
  expanded,
  onToggle,
  items,
}: {
  expanded: boolean;
  onToggle: () => void;
  items: TimelineItem[];
}) {
  const completedCount = items.filter((item) => item.status === "succeeded").length;

  return (
    <section
      className="workspace-task-card workspace-task-card-wide workspace-timeline-card"
      aria-labelledby="timeline-title"
    >
      <button
        aria-controls="timeline-body"
        aria-expanded={expanded}
        className="workspace-timeline-toggle"
        type="button"
        onClick={onToggle}
      >
        <div className="workspace-task-card-head">
          <div>
            <span className="workspace-task-eyebrow">Task timeline</span>
            <h2 id="timeline-title">Business progress</h2>
          </div>
          <div className="workspace-timeline-meta">
            <span>
              {completedCount}/{items.length} completed
            </span>
            <ChevronDown className="icon" aria-hidden="true" />
          </div>
        </div>
      </button>

      {expanded ? (
        <div className="workspace-plan-list" id="timeline-body">
          {items.map((item, index) => (
            <div className={`agent-task-step ${item.status}`} key={item.label}>
              <span className="agent-task-step-dot">{index + 1}</span>
              <div className="agent-task-step-content">
                <div className="agent-task-step-heading">
                  <span className="agent-task-step-name">{item.label}</span>
                  <span className="agent-task-step-status">{item.statusLabel}</span>
                </div>
                <p>{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
```

## 10. Task Composer

Task Composer 是主内容列底部的主要输入面。

使用类名：

- `agent-bottom-stack`
- `agent-composer`
- `agent-composer-footer`
- `agent-composer-plus`
- `agent-composer-spacer`
- `agent-send`

显示样式：

- 宽度：`min(920px, 100%)`
- 最小高度：`118px`
- 圆角：`22px`
- 背景：`rgba(43, 47, 40, 0.98)`
- textarea 无边框、透明背景。
- prompt 为空时 submit 按钮 disabled。

样例代码：

```tsx
import { ArrowUp, Plus } from "lucide-react";
import { type FormEvent } from "react";

export function TaskComposer({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (nextValue: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="agent-composer" onSubmit={onSubmit}>
      <label>
        <span className="sr-only">Describe your task</span>
        <textarea
          aria-label="Task prompt"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Describe your task to get started..."
          rows={3}
          value={value}
        />
      </label>
      <div className="agent-composer-footer">
        <button className="agent-composer-plus" type="button" aria-label="Add context">
          <Plus className="icon" aria-hidden="true" />
        </button>
        <span className="agent-composer-spacer" />
        <button className="agent-send" type="submit" disabled={!value.trim()} aria-label="Submit task">
          <ArrowUp className="icon" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
```

## 11. Loading 和 Error 状态

Loading 和 Error 状态是主内容列里的简单替换内容，不需要额外卡片结构。

使用类名：

- Loading：`empty-state`
- Error：`form-alert error`
- Spinner icon：`icon spin`

样例代码：

```tsx
import { LoaderCircle } from "lucide-react";

export function WorkspaceLoading() {
  return (
    <div className="empty-state">
      <LoaderCircle className="icon spin" aria-hidden="true" />
      <span>Loading workspace.</span>
    </div>
  );
}

export function WorkspaceError({ message }: { message: string }) {
  return <div className="form-alert error">{message}</div>;
}
```

## 12. 页面组装样例

下面是当前主界面基础区域的组合方式。

```tsx
"use client";

import { useState, type FormEvent } from "react";

const timelineItems = [
  {
    label: "Understand the request",
    description: "Identify the customer issue, urgency, and desired outcome.",
    status: "succeeded",
    statusLabel: "Done",
  },
  {
    label: "Collect missing details",
    description: "Ask for the customer email, order number, priority, and preferred tone.",
    status: "running",
    statusLabel: "Waiting",
  },
] as const;

export function WorkspaceMainExample() {
  const [prompt, setPrompt] = useState("");
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [thinkingOpen, setThinkingOpen] = useState({
    request: false,
    currentTask: false,
  });

  function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className="agent-experience agent-workspace-view">
      <section className="agent-workspace" aria-labelledby="workspace-title">
        <WorkspaceSidebar userEmail="alex@example.com" onSignOut={() => undefined} />
        <section className="agent-work-main">
          <WorkspaceTopbar workspaceName="Astra Workspace" />
          <WorkspaceConversation
            userIntent="Help respond to a customer who says last week's device order has not arrived."
            updatedAt="10:02"
            modelName="GPT-4.1"
          >
            <AssistantStatusSummary text="AstraOS found the next relevant step for this task." />
            <ThinkingSections
              state={thinkingOpen}
              onToggle={(key) => setThinkingOpen((current) => ({ ...current, [key]: !current[key] }))}
              userIntent="Help respond to a customer who says last week's device order has not arrived."
              taskTitle="Draft a customer response"
              progressSummary="AstraOS understands the customer issue and needs customer details before preparing the reply."
              statusLabel="Needs your input"
            />
            <AssistantResponse />
          </WorkspaceConversation>

          <section className="agent-bottom-stack" aria-label="Task composer">
            <CompactTimeline
              expanded={timelineOpen}
              onToggle={() => setTimelineOpen((current) => !current)}
              items={[...timelineItems]}
            />
            <TaskComposer value={prompt} onChange={setPrompt} onSubmit={submitTask} />
          </section>
        </section>
      </section>
    </main>
  );
}
```

## 13. 后续实现规则

- 除非明确批准整体视觉重做，否则保留 shell、sidebar、topbar、用户消息块、thinking 行、富文本回复、紧凑 timeline 和 composer 的现有类名。
- 不要在 assistant 回复和 composer 之间插入大型任务卡片，除非先重新设计产品信息架构。
- 任务进度文案必须是普通用户能理解的业务语言。
- 用户路径中不得暴露 `WorkflowRun`、`StepRun`、`ToolCall`、`RuntimeInvocation` 或原始 enum 名。
- 后续如果要实现 attention、approval、result 或 history 组件，必须先单独写替代设计说明，再进入实现。
