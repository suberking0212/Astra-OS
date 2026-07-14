# Workspace 视觉基线

更新时间：2026-07-14

本文档是旧前端清理后的视觉保留边界。

## 保留

- Workspace 作为第一入口。
- 沉浸式、专注、任务委托式界面气质。
- 登录、邮箱验证、工作区列表、工作区详情的视觉骨架。
- 任务输入区、等待态、按钮映射区、结果区的布局位置。

## 删除

- Employee-first 主路径。
- Test Chat 主路径。
- Admin Console 作为用户完成任务的必要路径。
- Run / Step / ToolCall / Usage 等内部对象在普通用户界面的主展示。
- 固定客服、采购、知识库等旧 demo 业务流的视觉承诺。

## 当前前端状态

Workspace 目前只连接：

- 注册 / 登录 / 邮箱验证
- 当前账号
- 工作区创建 / 列表 / 详情

Workspace 详情页保留未来按钮映射：

- Submit task
- Approve action
- Provide context
- View result

这些按钮只表达未来 Task-first Runtime 的 API 位置，不再连接旧硬编码 runtime。
