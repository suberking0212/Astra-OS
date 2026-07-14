# AstraOS Runtime 整改规格

更新时间：2026-07-14

本文档定义 AstraOS Runtime 从 Phase 4/4A 的“固定模板顺序执行”升级为 Phase 4B+ “可暂停、可恢复、可审计、可治理执行系统”的工程整改要求。

本文档服从：

- `WORKSPACE_FIRST_PRODUCT_REMEDIATION_SPEC.md`
- `MVP_ENGINEERING_SPEC.md`
- `docs/Chinese/full_phase/TECHNICAL_DESIGN.md`

核心判断：

```text
Agent 决定 AI 要做什么。
Runtime 决定 AI 能否可靠、可控、可恢复、可审计地把事情做完。
```

因此，本阶段整改重点不是增加更多 Agent 模板，而是让任何 AI Employee 都能复用统一 Runtime 能力。

## 1. 当前问题

当前代码已经具备 Runtime 雏形：

- `AppRun`
- `StepRun`
- `ToolCall`
- `UsageLog`
- `WorkflowTemplate`
- `ToolExecutor`
- `Approval`
- `Ticket`
- `TaskPlan`

但实现仍有以下问题：

- `RuntimeOrchestrator` 中大量依赖 `if step_key == ...` 的硬编码流程。
- Workflow Step 只是顺序列表，缺少可执行合同。
- Human Approval 不是 Runtime 一等能力，容易被实现成“跳过后续步骤”。
- Run 缺少明确等待态、恢复 token、等待原因、事件唤醒语义。
- Step 缺少 retry、timeout、attempt、resume event 等执行控制字段。
- Tool 缺少统一权限、幂等、副作用、schema 校验和审计要求。
- Runtime Trace 能看到“发生了什么”，但还不能完整回答“为什么停住、如何恢复、是否可安全重试”。

## 2. 整改目标

Phase 4B 后，Runtime 必须支持：

```text
创建运行
  -> 生成步骤
  -> 执行步骤
  -> 调用模型 / 工具 / 审批 / 条件
  -> 遇到审批或用户补充信息时暂停
  -> 记录恢复条件
  -> 收到事件后恢复
  -> 防止重复副作用
  -> 失败可追踪、可重试、可解释
  -> 输出业务结果和审计 Trace
```

平台内部目标：

- Runtime 成为独立执行平面，不只是 API service 里的业务函数。
- Workflow Definition 成为可执行数据，不只是展示步骤。
- Tool Definition 成为治理合同，不只是 Python 分支。
- Approval、Permission、Idempotency、Trace 成为 Runtime 的默认能力。

用户体验目标：

- Workspace 只展示任务、计划、权限、等待原因、审批、结果。
- 用户不需要理解 `AppRun`、`StepRun`、`ToolCall`。
- Console / Admin 只用于治理、观测、审计和调试。

## 3. 预期架构

目标分层：

```text
Workspace / Console
  -> API / Control Plane
  -> Task Intake / AI Employee Decision Layer
  -> Runtime Engine
  -> Step Executor Registry
  -> Tool Executor / LLM Executor / Approval Executor / Condition Executor
  -> Domain Services / Connectors / Models / Knowledge
  -> PostgreSQL / Qdrant / File Storage
```

控制面负责：

- AIApp 配置
- WorkflowTemplate 管理
- ToolDefinition 管理
- 权限策略
- 模型配置
- 审计查询

运行面负责：

- AppRun 生命周期
- StepRun 状态机
- ToolCall 执行与审计
- Human Approval 暂停与恢复
- Retry / Timeout / Idempotency
- Run Trace

### 3.1 Agent 与 Runtime 的运行关系

Runtime 不直接运行一个模糊的 Agent。Runtime 运行的是 Agent / Employee Decision Layer 产出的结构化执行合同。

正确链路：

```text
TaskRequest
  -> EmployeeDecision
  -> ContextBundle
  -> TaskPermissionGrant
  -> TaskPlan
  -> RuntimeInvocation
  -> RuntimeEngine
  -> AppRun / StepRun / ToolCall
  -> TaskOutcome
```

分工：

| 层 | 负责什么 | 不允许做什么 |
| --- | --- | --- |
| Agent / Employee Decision Layer | 判断意图、路径、权限、审批、结果标准 | 直接写表、直接调用 Tool、直接修改 Runtime 状态 |
| Planning Layer | 生成用户可理解、Runtime 可映射的计划 | 把内部 StepRun 原样暴露给用户 |
| RuntimeEngine | 执行、暂停、恢复、重试、超时、审计 | 依赖自由文本 prompt 判断下一步 |
| ToolExecutor | 受控读取、写入和外部动作 | 绕过权限、审批、幂等 |
| Outcome Layer | 判断 Task 是否真正完成 | 用 Run 成功代替 Task 成功 |

耦合原则：

```text
Agent 与 Runtime 通过 RuntimeInvocation / WorkflowTemplate / ToolDefinition 耦合。
Agent 与 Runtime 不通过 prompt 文本、业务分支代码或共享内部状态耦合。
```

### 3.2 RuntimeInvocation 格式

进入 Runtime 的对象必须是 `RuntimeInvocation`，不能是原始用户 prompt 或未校验的模型自由文本。

```json
{
  "id": "uuid",
  "task_request_id": "uuid",
  "decision_id": "uuid",
  "task_id": "uuid",
  "workspace_id": "uuid",
  "selected_employee_id": "uuid",
  "invocation_type": "workflow",
  "workflow_template_key": "purchase_record_intake_v1",
  "workflow_input": {
    "ticket_id": "uuid",
    "attachment_ids": ["uuid"]
  },
  "context_bundle_id": "uuid",
  "permission_grant_ids": ["uuid"],
  "approval_requirements": [
    {
      "key": "confirm_purchase_record_before_write",
      "action": "create_purchase_record",
      "resource_type": "purchase_record",
      "required_before_step": "commit_purchase_record"
    }
  ],
  "outcome_spec": {
    "desired_result": "Create a verified purchase record, asset, and reminder.",
    "success_criteria": [
      "purchase_record_created",
      "owned_asset_created",
      "applecare_reminder_created"
    ]
  },
  "created_at": "2026-07-14T12:00:00Z"
}
```

校验要求：

- `invocation_type = workflow` 时，`workflow_template_key` 必须存在且已注册。
- `workflow_input` 必须通过 Workflow input schema 校验。
- `permission_grant_ids` 必须属于当前 Task / Workspace / User。
- `approval_requirements` 必须与 Workflow Step / ToolDefinition 的写操作匹配。
- `outcome_spec` 必须持久化到 `AppRun.input` 或关联 Task/Ticket 元数据中。
- `selected_employee_id` 用于身份、能力和策略约束，不用于让 Runtime 执行 prompt。

三类 invocation：

| 类型 | Runtime 行为 |
| --- | --- |
| `direct_answer` | 可创建轻量结果记录，不需要完整 Workflow Run |
| `clarification` | 创建等待用户补充信息的 Task 状态 |
| `workflow` | 创建 `AppRun` 并执行 Workflow |

禁止：

- Runtime 根据 `raw_input` 临时猜测 workflow。
- Runtime 执行 Agent 返回的任意 tool name。
- Runtime 在缺少 permission grant 或 approval requirement 的情况下执行写操作。

## 4. Runtime 状态机

### 4.1 AppRun 状态

`AppRun.status` 必须使用以下枚举：

```text
running
waiting_for_user
waiting_for_approval
paused
succeeded
failed
cancelled
```

语义要求：

| 状态 | 含义 | 是否终态 |
| --- | --- | --- |
| `running` | Runtime 正在执行 | 否 |
| `waiting_for_user` | 等待用户补充信息或重新授权 | 否 |
| `waiting_for_approval` | 等待用户审批某个副作用动作 | 否 |
| `paused` | 系统或策略主动暂停 | 否 |
| `succeeded` | 本次运行完成 | 是 |
| `failed` | 本次运行失败且未自动恢复 | 是 |
| `cancelled` | 用户或系统取消 | 是 |

禁止：

- 用 `succeeded` 表达“已创建审批但还没完成任务”。
- 用 `skipped` 步骤代替 Runtime 等待态。
- 在等待用户审批时提前写入业务表。

### 4.2 StepRun 状态

`StepRun.status` 必须使用以下枚举：

```text
pending
running
waiting
succeeded
failed
skipped
```

语义要求：

| 状态 | 含义 |
| --- | --- |
| `pending` | 已生成但尚未执行 |
| `running` | 正在执行 |
| `waiting` | 当前步骤触发暂停，等待外部事件恢复 |
| `succeeded` | 步骤完成 |
| `failed` | 步骤失败 |
| `skipped` | Runtime 根据条件跳过 |

等待态要求：

- `status = waiting` 时，`completed_at` 必须为 `null`。
- 必须写入 `resume_event_type`。
- 必须写入最小 `resume_payload`。

示例：

```json
{
  "step_key": "request_approval",
  "status": "waiting",
  "resume_event_type": "approval.approved",
  "resume_payload": {
    "approval_id": "uuid",
    "ticket_id": "uuid",
    "next_step_key": "commit_purchase_record"
  }
}
```

## 5. 数据字段要求

### 5.1 AppRun 字段

必须包含：

```text
id
project_id
ai_app_id
conversation_id nullable
ticket_id nullable
trigger_type
status
resume_token nullable
wait_reason nullable
last_event_at nullable
workflow_template_key
workflow_version
input
output
error nullable
started_at nullable
completed_at nullable
created_at
updated_at
```

字段语义：

| 字段 | 要求 |
| --- | --- |
| `resume_token` | 外部事件恢复标识，例如 `approval:{approval_id}` |
| `wait_reason` | 面向系统和审计的等待原因，例如 `purchase_record_confirmation_required` |
| `last_event_at` | 最近一次 Runtime 事件时间 |
| `input` | 运行输入快照，不得包含未脱敏密钥 |
| `output` | 当前状态和最终结果，等待态也必须可解释 |

等待审批示例：

```json
{
  "status": "waiting_for_approval",
  "resume_token": "approval:8c2e...",
  "wait_reason": "purchase_record_confirmation_required",
  "output": {
    "waiting_for_approval": true,
    "resume_event_type": "approval.approved",
    "resume_hint": {
      "approval_id": "8c2e...",
      "next_step_key": "commit_purchase_record"
    }
  }
}
```

### 5.2 StepRun 字段

必须包含：

```text
id
app_run_id
project_id
ai_app_id
step_key
step_name
step_type
position
status
attempt
max_attempts
timeout_seconds nullable
next_retry_at nullable
resume_event_type nullable
resume_payload
input
output
error nullable
started_at nullable
completed_at nullable
created_at
updated_at
```

字段语义：

| 字段 | 要求 |
| --- | --- |
| `attempt` | 当前尝试次数，从 1 开始 |
| `max_attempts` | 最大尝试次数，不允许无限重试 |
| `timeout_seconds` | 步骤超时控制 |
| `next_retry_at` | 失败后下一次重试时间 |
| `resume_event_type` | 等待态唤醒事件类型 |
| `resume_payload` | 恢复所需最小数据 |

### 5.3 ToolCall 字段

必须包含：

```text
id
app_run_id
step_run_id
project_id
ai_app_id
tool_key
status
idempotency_key nullable
side_effect_committed
arguments
result
error nullable
latency_ms nullable
started_at nullable
completed_at nullable
created_at
```

字段语义：

| 字段 | 要求 |
| --- | --- |
| `idempotency_key` | 写操作必须提供或由 Runtime 生成 |
| `side_effect_committed` | 表示工具是否已经产生业务副作用 |
| `arguments` | 入参快照，密钥和敏感字段必须脱敏 |
| `result` | 输出快照，必须包含创建的业务对象 ID |

幂等 key 示例：

```text
approval:{approval_id}:create_purchase_record
ticket:{ticket_id}:request_approval:{step_key}
run:{app_run_id}:step:{step_key}:tool:{tool_key}
```

## 6. Workflow Definition 格式

短期仍可使用内置 Workflow Template，但步骤必须逐步升级为可执行定义。

### 6.1 WorkflowTemplate 顶层格式

```json
{
  "template_key": "purchase_record_intake_v1",
  "family_key": "personal_admin_agent",
  "version": 1,
  "name": "Purchase Record Intake v1",
  "runtime_version": "phase4b",
  "trigger": {
    "type": "ticket",
    "ticket_types": ["add_purchase_record"]
  },
  "steps": []
}
```

### 6.2 Step 定义格式

每个 Step 必须具备：

```json
{
  "step_key": "request_approval",
  "step_name": "Request Approval",
  "step_type": "approval",
  "position": 5,
  "executor": "approval.request",
  "input_mapping": {
    "ticket_id": "$context.ticket.id",
    "proposed_diff": "$state.extraction"
  },
  "required_permissions": ["create_purchase_record"],
  "side_effect_level": "draft",
  "retry_policy": {
    "max_attempts": 1,
    "backoff_seconds": 0
  },
  "timeout_seconds": 30,
  "on_success": "pause_run",
  "on_wait": {
    "app_run_status": "waiting_for_approval",
    "resume_event_type": "approval.approved",
    "next_step_key": "commit_purchase_record"
  },
  "on_failure": "record_failure"
}
```

字段要求：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `step_key` | 是 | 模板内唯一 |
| `step_type` | 是 | `trigger` / `planning` / `extraction` / `approval` / `tool` / `condition` / `outcome` 等 |
| `executor` | 是 | 绑定 StepExecutor |
| `input_mapping` | 是 | 从 context/state 映射输入 |
| `required_permissions` | 否 | 执行前必须满足的权限 |
| `side_effect_level` | 是 | `none` / `read` / `draft` / `write` / `external` |
| `retry_policy` | 是 | 不允许隐式无限重试 |
| `timeout_seconds` | 否 | 长任务必须设置 |
| `on_success` | 是 | 成功后的动作或下一步 |
| `on_wait` | 否 | 等待态配置 |
| `on_failure` | 是 | 失败后的处理策略 |

禁止：

- Step 内直接写业务表。
- LLM 输出直接进入业务表。
- Step 跳过权限和审批检查调用写操作 Tool。

## 7. Tool Definition 格式

Tool 是 Runtime 的受控执行单元。所有业务写入必须通过 Tool 或 Domain Service，不允许 Agent/LLM 直接写表。

### 7.1 ToolDefinition 格式

```json
{
  "tool_key": "create_purchase_record",
  "display_name": "Create Purchase Record",
  "provider": "builtin",
  "is_builtin": true,
  "is_active": true,
  "side_effect_level": "write",
  "required_permissions": ["create_purchase_record"],
  "requires_approval": true,
  "idempotency": {
    "required": true,
    "key_template": "approval:{approval_id}:create_purchase_record"
  },
  "timeout_seconds": 10,
  "retry_policy": {
    "max_attempts": 1
  },
  "input_schema": {
    "type": "object",
    "required": ["approval_id", "normalized_purchase_json"],
    "properties": {
      "approval_id": { "type": "string", "format": "uuid" },
      "normalized_purchase_json": { "type": "object" }
    }
  },
  "output_schema": {
    "type": "object",
    "required": ["purchase_record_id", "purchase_item_ids"],
    "properties": {
      "purchase_record_id": { "type": "string", "format": "uuid" },
      "purchase_item_ids": {
        "type": "array",
        "items": { "type": "string", "format": "uuid" }
      }
    }
  }
}
```

### 7.2 Tool side effect 等级

```text
none      不产生外部或业务副作用
read      只读取数据
draft     创建草稿或审批请求
write     写入业务记录
external  调用外部系统、发送邮件、支付、下单等
```

执行要求：

| 等级 | 是否需要权限 | 是否需要审批 | 是否需要幂等 |
| --- | --- | --- | --- |
| `none` | 否 | 否 | 否 |
| `read` | 是 | 视数据范围而定 | 否 |
| `draft` | 是 | 否 | 建议 |
| `write` | 是 | 是 | 是 |
| `external` | 是 | 是 | 是 |

## 8. StepExecutor 接口

RuntimeEngine 不应直接写所有业务逻辑。每类步骤应由独立 executor 执行。

### 8.1 Python 接口示例

```python
from dataclasses import dataclass
from typing import Literal


StepStatus = Literal["succeeded", "waiting", "skipped", "failed"]


@dataclass
class StepExecutionResult:
    status: StepStatus
    output: dict
    resume_event_type: str | None = None
    resume_payload: dict | None = None
    next_step_key: str | None = None
    error: str | None = None


class StepExecutor:
    executor_key: str

    async def execute(
        self,
        invocation: "RuntimeInvocation",
        context: "RuntimeExecutionContext",
        step: "StepDefinition",
    ) -> StepExecutionResult:
        raise NotImplementedError
```

### 8.2 Approval executor 示例

```python
class ApprovalRequestExecutor(StepExecutor):
    executor_key = "approval.request"

    async def execute(self, invocation, context, step):
        approval = await context.tool_executor.execute(
            "request_approval",
            {
                "ticket_id": str(context.ticket.id),
                "approval_type": "purchase_record_confirmation",
                "proposed_action": "create_purchase_record",
                "proposed_diff": {"normalized_purchase": context.state["extraction"]},
            },
            app_run=context.app_run,
            step_run=context.step_run,
            owner=context.owner,
            allowed_knowledge_base_ids=[],
        )
        return StepExecutionResult(
            status="waiting",
            output=approval,
            resume_event_type="approval.approved",
            resume_payload={
                "approval_id": approval["approval_id"],
                "next_step_key": "commit_purchase_record",
            },
        )
```

## 9. RuntimeEngine 执行循环

目标执行循环：

```python
class RuntimeEngine:
    async def run(self, invocation: RuntimeInvocation, context: RuntimeContext) -> AppRun:
        await self.validate_invocation(invocation, context)
        app_run = await self.create_or_resume_run(invocation, context)
        plan = await self.resolve_runtime_plan(invocation.workflow_template_key)

        while True:
            step = self.next_step(plan, app_run)
            if step is None:
                return await self.complete_run(app_run, invocation.outcome_spec)

            step_run = await self.create_step_run(app_run, step)

            try:
                result = await self.executor_registry.execute(invocation, context, step, step_run)
            except Exception as exc:
                return await self.handle_step_failure(app_run, step_run, exc)

            if result.status == "waiting":
                return await self.pause_run(app_run, step_run, result)

            if result.status == "failed":
                return await self.handle_step_failure(app_run, step_run, result.error)

            await self.complete_step(step_run, result)
```

恢复执行循环：

```python
async def resume(self, resume_event: RuntimeResumeEvent) -> AppRun:
    app_run = await self.load_waiting_run(resume_event.resume_token)
    step_run = await self.load_waiting_step(app_run.id, resume_event.event_type)
    invocation = await self.load_invocation(app_run)

    await self.mark_resume_event(app_run, step_run, resume_event)
    return await self.run(
        invocation.with_resume(
            resume_from_step_key=step_run.resume_payload["next_step_key"],
            resume_payload=resume_event.payload,
        ),
        RuntimeContext(
            existing_app_run=app_run,
            resume_from_step_key=step_run.resume_payload["next_step_key"],
            metadata=resume_event.payload,
        )
    )
```

`validate_invocation` 至少必须检查：

```python
async def validate_invocation(self, invocation, context) -> None:
    if invocation.invocation_type == "workflow" and not invocation.workflow_template_key:
        raise RuntimeValidationError("workflow invocation requires workflow_template_key")
    if invocation.workflow_template_key:
        await self.workflow_registry.assert_registered(invocation.workflow_template_key)
    await self.permission_service.assert_grants_valid(invocation.permission_grant_ids, context.owner)
    await self.policy_service.assert_employee_can_run(
        invocation.selected_employee_id,
        invocation.workflow_template_key,
        context.owner,
    )
```

## 10. Resume Event 格式

所有外部恢复必须转成统一 RuntimeResumeEvent。

```json
{
  "event_type": "approval.approved",
  "resume_token": "approval:8c2e...",
  "project_id": "uuid",
  "owner_user_id": "uuid",
  "payload": {
    "approval_id": "8c2e...",
    "ticket_id": "uuid",
    "normalized_purchase": {}
  },
  "occurred_at": "2026-07-14T12:00:00Z"
}
```

事件类型建议：

```text
approval.approved
approval.rejected
user.message_received
user.permission_granted
user.permission_revoked
timer.fired
webhook.received
system.retry_due
```

## 11. Approval 与 Permission 要求

审批不是业务表单，而是 Runtime 对副作用动作的控制点。

审批创建要求：

```json
{
  "approval_type": "purchase_record_confirmation",
  "proposed_action": "create_purchase_record",
  "proposed_diff": {
    "normalized_purchase": {
      "merchant": "Apple Store",
      "order_number": "W1234567890",
      "total_amount": 129492
    }
  }
}
```

审批通过后：

- `Approval.status = approved`
- `Ticket.status = approved`
- Runtime 通过 `approval.approved` 事件恢复
- 写操作 Tool 检查 approval 状态
- 写操作 Tool 使用 approval ID 作为幂等 key 的一部分

审批拒绝后：

- `Approval.status = rejected`
- `Ticket.status = waiting_for_user`
- Runtime 不得继续执行写操作
- Workspace 必须展示用户可修改或取消任务的入口

## 12. 幂等与副作用要求

所有 `write` / `external` 工具必须满足：

- 必须有 `idempotency_key`
- 必须在数据库层有唯一约束或等价保护
- 重复调用不得创建重复业务对象
- `ToolCall.side_effect_committed` 必须准确记录

购买记录示例：

```text
Tool: create_purchase_record
Idempotency key: approval:{approval_id}:create_purchase_record
DB guard: unique(source_ticket_id, source_approval_id)
```

提醒示例：

```text
Tool: create_reminder
Idempotency key: purchase_item:{purchase_item_id}:reminder:{reminder_type}:{due_at}
DB guard: unique(owner_user_id, purchase_item_id, reminder_type, due_at)
```

## 13. Trace 输出要求

Run Trace 必须能回答：

- 这个任务为什么启动？
- 当前执行到哪一步？
- 为什么停住？
- 等待什么事件恢复？
- 哪些工具被调用？
- 哪些工具产生了副作用？
- 副作用是否幂等？
- 哪些模型被调用，消耗多少 token？
- 最终创建了哪些业务对象？

Trace 最小响应格式：

```json
{
  "app_run": {
    "id": "uuid",
    "status": "waiting_for_approval",
    "resume_token": "approval:uuid",
    "wait_reason": "purchase_record_confirmation_required"
  },
  "steps": [
    {
      "step_key": "request_approval",
      "status": "waiting",
      "resume_event_type": "approval.approved",
      "resume_payload": {
        "approval_id": "uuid",
        "next_step_key": "commit_purchase_record"
      }
    }
  ],
  "tool_calls": [
    {
      "tool_key": "request_approval",
      "status": "succeeded",
      "idempotency_key": "ticket:uuid:request_approval:request_approval",
      "side_effect_committed": true
    }
  ],
  "usage": [],
  "messages": []
}
```

## 14. API 行为要求

### 14.1 启动任务

```http
POST /projects/{project_id}/task-intakes
```

返回要求：

- 如果需要审批，`run.status` 必须是 `waiting_for_approval`。
- 返回 `ticket`。
- 返回 `run.resume_token`。
- 不得返回 `succeeded`，除非任务已真正完成。

### 14.2 恢复任务

短期兼容接口：

```http
POST /tickets/{ticket_id}/resume
```

示例：

```json
{
  "approval_id": "uuid"
}
```

长期目标接口：

```http
POST /runtime/resume-events
```

示例：

```json
{
  "event_type": "approval.approved",
  "resume_token": "approval:uuid",
  "payload": {
    "approval_id": "uuid"
  }
}
```

## 15. 前端展示要求

Workspace 展示业务态：

```text
任务目标
执行计划
当前步骤
等待原因
需要审批的动作
证据引用
已完成动作
最终结果
```

Console 展示技术态：

```text
AppRun
StepRun
ToolCall
UsageLog
Latency
Token
Error
Trace
```

前端状态映射：

| Runtime 状态 | Workspace 展示 |
| --- | --- |
| `running` | 正在执行 |
| `waiting_for_user` | 需要补充信息 |
| `waiting_for_approval` | 等待确认 |
| `paused` | 已暂停 |
| `succeeded` | 已完成 |
| `failed` | 执行失败 |
| `cancelled` | 已取消 |

禁止：

- 把 `waiting_for_approval` 显示成任务完成。
- 在 Workspace 要求用户理解 `run_id`、`tool_call_id`。
- 将审批主路径放到 Admin Console。

## 16. 代码整改顺序

### Phase 4B.1 等待态和恢复字段

必须完成：

- 扩展 `AppRun.status`
- 扩展 `StepRun.status`
- 增加 `resume_token`
- 增加 `wait_reason`
- 增加 `resume_event_type`
- 增加 `resume_payload`
- 增加 `idempotency_key`
- 增加 `side_effect_committed`
- 更新 Alembic
- 更新 Pydantic schema
- 更新前端 API 类型

### Phase 4B.2 Approval pause/resume

必须完成：

- `request_approval` step 返回 `waiting`
- `AppRun.status = waiting_for_approval`
- 审批通过后恢复到 `commit_purchase_record`
- 审批拒绝后不执行写操作
- Trace 能看到等待原因和恢复事件

### Phase 4B.3 Tool Governance

必须完成：

- ToolDefinition 增加 side effect、权限、审批、幂等字段
- ToolExecutor 执行前校验 permission
- ToolExecutor 执行前校验 approval
- 写工具统一生成或校验 idempotency key
- 敏感参数脱敏

### Phase 4B.4 RuntimeEngine 抽象

必须完成：

- 新增 `RuntimeEngine`
- 新增 `StepExecutorRegistry`
- 将 customer support / purchase intake 从硬编码分支迁移到 executor
- 保持现有 API 不破坏
- 保持现有测试通过

## 17. 测试要求

必须覆盖：

### 17.1 等待审批

```text
创建 purchase ticket
  -> grant permission
  -> resume
  -> run.status == waiting_for_approval
  -> last step.status == waiting
  -> no purchase_record created
```

### 17.2 审批恢复

```text
approve approval
  -> resume with approval_id
  -> run.status == succeeded
  -> purchase_record created
  -> owned_asset created
  -> reminder created
  -> ticket.status == completed
```

### 17.3 拒绝审批

```text
reject approval
  -> resume or event received
  -> no write tool executed
  -> ticket.status == waiting_for_user
  -> run.status != succeeded
```

### 17.4 幂等

```text
same approval_id resume twice
  -> only one purchase_record
  -> only one asset per item
  -> only one reminder per item/deadline
  -> trace records repeated attempt safely
```

### 17.5 权限

```text
without attachment permission
  -> extract_purchase_fields fails
  -> run.status == failed or waiting_for_user
  -> no business write
```

### 17.6 原客服链路回归

```text
customer_support_v1
  -> chat_trigger
  -> intent_detection
  -> knowledge_search
  -> llm_answer
  -> collect_info
  -> create_ticket optional
  -> response
```

## 18. 验收标准

Phase 4B 完成标准：

- 购买录入首次执行停在 `waiting_for_approval`。
- 审批通过后可恢复并完成。
- 审批拒绝不会写业务表。
- Run Trace 能显示等待原因、恢复事件、幂等 key、副作用提交状态。
- `ToolCall` 对写操作记录 `idempotency_key`。
- `StepRun` 对等待步骤记录 `resume_event_type` 和 `resume_payload`。
- `AppRun` 等待态不设置 `completed_at`。
- 前端不会把等待审批误显示为完成。
- 后端测试、lint、前端 typecheck 通过。

建议命令：

```bash
cd services/api
source .venv/bin/activate
alembic upgrade head
pytest app/tests/test_runtime_purchase_intake_phase4a.py app/tests/test_runtime_phase4.py
ruff check app

cd ../..
pnpm --filter @astraos/web typecheck
```

## 19. 禁止事项

Runtime 整改期间禁止：

- 为每个新 AI Employee 复制一套独立 orchestrator。
- 让 LLM 直接写业务表。
- 跳过 ToolExecutor 调用 Domain Service。
- 用 `succeeded` 表示“等待用户下一步”。
- 无审批执行 `write` 或 `external` 工具。
- 无幂等保护执行写操作。
- 在 Trace 中隐藏失败、跳过、等待原因。
- 把普通用户任务主路径迁移到 Admin Console。

## 20. 最终目标

整改完成后，AstraOS 的核心能力应表达为：

```text
AI Employee 负责理解目标、提出计划、请求权限、解释结果。
Runtime 负责执行状态、工具治理、审批暂停、事件恢复、幂等保护、错误处理和审计追踪。
```

这也是 AstraOS 与普通 Chatbot / Prompt 编排平台的关键区别。
