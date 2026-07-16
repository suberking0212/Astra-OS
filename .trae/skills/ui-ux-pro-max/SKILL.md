---
name: "ui-ux-pro-max"
description: "Applies UI-UX Pro Max to TRAE product work. Invoke when the user asks for UI polish, UX redesign, dark-theme refinement, layout cleanup, interaction review, or design QA in TRAE."
---

# UI-UX Pro Max

将 `UI-UX Pro Max` 作为 TRAE 场景下的高约束 UI/UX 执行规范。

当用户要求以下任一事项时，优先调用本技能：
- UI 重构、视觉升级、排版收紧、对齐修复
- 深色沉浸式界面优化
- 表单、输入区、聊天区、工作区的交互与层级梳理
- 设计走查、体验审计、设计 QA
- 需要把需求冻结为可执行的 `Scope Freeze` / `Freeze-ready` 清单

## TRAE Support

本技能面向 TRAE 内的代码与设计协作流程，输出应满足：
- 先收口范围，再动代码
- 默认采用外科手术式编辑，尊重现有结构
- 优先给出可验收的二元标准，而不是模糊建议
- 对 UI 调整同步补齐约束、验收点与风险说明

## Core Principles

1. 深色沉浸，不做花哨装饰
2. 去横幅、去强标题感、去无意义标签
3. 强调信息层级、输入效率、CTA 清晰度
4. 组件宽度、间距、字体、滚动边界必须统一
5. 默认做响应式与可访问性检查

## AstraOS Defaults

若当前仓库未显式覆盖，默认遵循以下约束：
- 字体栈：`Figtree, Arial, Helvetica, sans-serif`
- 正文：`16px`
- 区块标题：`14px`
- 弱提示/状态：`14px` 或 `12px`
- 登录页必须锁定 `100dvh`
- 运行时工作区禁止 `100vw`，统一使用 `width: 100%; max-width: 100%`
- 聊天区底部滚动安全边界必须足够，避免被输入框遮挡
- AI 回复采用纯正文流，不使用气泡或背板
- `"Current requirement"` 只能作为输入框上方轻提示，不能做成标题横幅

## Forbidden Patterns

- 大写标签式分组标题
- 带背景色块的横幅式说明区
- 为了“设计感”引入多余容器层
- 输入区与内容区版心不一致
- 灰色文本对比度不足

## Workflow

1. 先冻结范围：明确本次只改哪些区域，不外溢
2. 提炼约束：列出必须保留、必须删除、必须新增
3. 输出方案：给出结构分组、状态、交互、响应式策略
4. 实施修改：优先最小改动完成最大收益
5. 验收回归：逐条核对视觉、交互、滚动、可读性、移动端

## Output Contract

每次使用本技能时，输出至少应包含：
- `Scope Freeze`
- `设计约束`
- `实施项`
- `验收清单`

验收清单应尽量使用二元判定，例如：
- `输入卡片与聊天滚动区宽度完全一致`
- `页面在移动端无横向滚动`
- `弱提示文本对比度达到可读阈值`
- `AI 回复区域无气泡和背板`

## Design Review Mode

若用户请求“审查 UI/UX”或“看看设计哪里不对”，优先输出：
- 破坏沉浸感的问题
- 影响操作效率的问题
- 层级与对齐错误
- 文案提示是否过重
- 交互反馈是否过多或过少

结论要短、准、可落地，避免空泛审美描述。
