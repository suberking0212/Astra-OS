# AstraOS Task-first 临时整改计划（已废弃）

状态：`superseded`

废弃日期：2026-07-16

本文档原先包含的产品定位、Agent 定义、Control Plane 职责和实现顺序已经被重构后的权威文档替代。为避免旧口径继续误导实现，历史正文不再保留为可执行计划。

当前唯一有效的文档分工为：

- 系统层级与主权：`ARCHITECTURE_BASELINE.md`
- Runtime 到 Workspace 的用户语义：`TASK_PRESENTATION_CONTRACT.md`
- Runtime 状态机、对象、治理与 Executor Adapter：`RUNTIME_REMEDIATION_SPEC.md`
- Workspace 视觉和交互边界：`WORKSPACE_VISUAL_BASELINE.md`
- 阶段、依赖、Gate 和状态：`PHASED_ENGINEERING_DELIVERY_PLAN.md`

当前核心口径：

```text
AstraOS = Enterprise AI Operating System
AI Employee = 企业业务责任与治理对象
Agent Runtime = 可替换 Executor Backend
Governance Harness Services = 执行边界治理
Managed Runtime = 持久任务、交互、恢复和跨 Executor 协调
Tool = Executor 通过 AstraOS Tool Gateway 请求的受治理能力
```

本文件只保留为历史路径占位，禁止作为设计、实现或验收依据。
