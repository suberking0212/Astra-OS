# AstraOS

AstraOS is an Enterprise AI Operating System.

AI Employee is an enterprise business responsibility and governance object defined by the AstraOS Control Plane and operated by the AstraOS Managed Runtime. Hermes / Agent Runtime is a replaceable execution backend, not the whole system.

## Current Scope

- JWT authentication
- Registration, login, email verification, and account identity
- A single Workspace shell using the frozen `workspace-presentation-v1` contract
- Production `ApiWorkspaceTaskRepository` and isolated Preview/Test `MockWorkspaceTaskRepository`
- A default-off in-memory Phase 2 Mock API for task-loop contract validation
- Preview assets isolated from production and disabled by default

Real Runtime persistence, LLM execution, Tools, Executors, Governance writes, and external side effects are not part of the current production path. Phase 2 task interactions and results are isolated Mock behavior only.

## Local Development

### Prerequisites

- Docker Desktop with the Docker daemon running
- Node.js with `pnpm` available, or Corepack enabled
- Python 3.11 or 3.12（Python 3.13 暂不在支持范围内）
- `curl` and `lsof`

### Start everything with the shell script

From the repository root:

```bash
./scripts/dev.sh
```

`scripts/dev.sh` 默认锁定 `conda` 的 `agent-core` 环境，并使用其中的 Python 解释器启动后端；只有在你显式传入 `PYTHON_BIN` 或 `LOCKED_PYTHON_BIN` 时才会改用其他解释器。

The root package script calls the same shell script, so this is equivalent when `pnpm` is already available:

```bash
pnpm dev
```

If the executable bit was lost after copying the repository:

```bash
chmod +x scripts/dev.sh
./scripts/dev.sh
```

The script performs the complete local startup sequence:

1. Stops API, Web, and log processes that are both recorded by the previous run and verified as AstraOS-owned. Unknown port owners are diagnosed and left running unless force cleanup is explicitly enabled.
2. Creates `.env` from `.env.example` when `.env` does not exist.
3. Starts PostgreSQL and Qdrant with Docker Compose and waits for them to become healthy.
4. Installs frontend dependencies when they are missing.
5. Creates `services/api/.venv` when needed and installs backend dependencies.
6. Applies all Alembic database migrations.
7. Starts FastAPI and Next.js, then waits for both applications to respond.

Process IDs are stored under `.logs/pids/`. Starting the script again automatically stops verified previous FastAPI and Next.js processes before creating new ones. If an unrelated or unverified process owns a configured port, startup reports its PID and command, then exits without terminating it. Set `ASTRAOS_FORCE_PORT_CLEANUP=true` only when you explicitly want to force cleanup of an unknown port owner.

When startup succeeds, open:

- Workspace: [http://localhost:3000/workspace](http://localhost:3000/workspace)
- Login: [http://localhost:3000/login](http://localhost:3000/login)
- API health: [http://localhost:8000/health](http://localhost:8000/health)

Keep the terminal open while developing. Press `Ctrl+C` to stop FastAPI and Next.js. PostgreSQL and Qdrant remain available for the next startup; stop them separately with:

```bash
pnpm infra:down
```

Logs are written to:

```text
.logs/api.log
.logs/web.log
```

Optional overrides:

```bash
API_PORT=8100 WEB_PORT=3100 ./scripts/dev.sh
PYTHON_BIN=/Users/laosun/miniconda3/envs/agent-core/bin/python ./scripts/dev.sh
LOCKED_CONDA_ENV_NAME=agent-core ./scripts/dev.sh
API_LOG_LEVEL=info ./scripts/dev.sh
```

To enable the isolated product-shape Preview for local development, set this in `.env` before starting:

```text
ENABLE_WORKSPACE_PREVIEWS=true
```

Preview assets are disabled by default and are not part of the production Workspace data path.

To enable the isolated Phase 2 in-memory Workspace API locally, set:

```text
ENABLE_MOCK_WORKSPACE_API=true
```

This switch is disabled by default and must remain disabled in production deployments.

## Architecture

```text
Frontend（Workspace）
  -> API Layer（JWT / Auth / REST / WS / Organization / Marketplace API）
  -> AstraOS Control Plane
  -> Employee Execution Profile / Task Routing Configuration
  -> AstraOS Governance Harness Services
  -> AstraOS Managed Runtime
  -> Runtime Adapter / Selected Executor
      ├── Direct Model Runtime
      ├── Workflow Runtime
      ├── Agent Runtime
      └── Human Executor
  -> Allowed Tools through AstraOS Tool Gateway
  -> Outcome Validation / TaskResult
  -> Foundation Layer（LLM / Browser / MCP / Database / Redis / Storage / Optional Queue）
```

Agent Runtime is an autonomous execution unit. AI Employee is an enterprise business responsibility and governance object. Employee Execution Profile selects and constrains the Executor through Task Routing Configuration.

AstraOS does not build a second model-execution Agent Harness. Hermes and other Agent Runtimes own the model decision loop, executor-local context, tool-calling loop, Skills, Subagents and model adapters. AstraOS Governance Harness Services manage execution boundaries, while the Managed Runtime manages durable tasks, interactions, recovery and cross-executor coordination.

Tools are governed capabilities requested by Executors through the AstraOS Tool Gateway. Tools are not independent Executor types.

Human execution supports both direct routing and takeover. A task may route directly to `HumanExecutor` when policy, professional qualification, user choice, or capability constraints require human execution from the start. Takeover is a separate escalation path from an existing Executor. Human approval alone does not make the human an Executor when the approved action is still performed by a Tool, Workflow, or Agent Runtime.

Queue is an optional Foundation capability for background jobs, retry, resume events, and delayed tasks; it may later support deferred human-work assignment. It is not part of the current MVP deployment dependencies.

Product MVP exits at Gate 4 with the first governed Customer Support Employee loop. HumanExecutor remains an MVP contract and architecture boundary, but real human-work assignment, claiming, team inboxes, and organization collaboration are deferred. Phase 5 External Agent / Hermes integration is a post-MVP POC, not an MVP launch prerequisite.

Primary architecture source:

- `docs/Chinese/mvp/ARCHITECTURE_BASELINE.md`

Authoritative implementation scope and long-term roadmap:

- `docs/Chinese/mvp/MVP_SCOPE_AND_LONG_TERM_ROADMAP.md`

Authoritative supporting documents, in precedence order:

- `docs/Chinese/mvp/TASK_PRESENTATION_CONTRACT.md`
- `docs/Chinese/mvp/RUNTIME_REMEDIATION_SPEC.md`
- `docs/Chinese/mvp/WORKSPACE_VISUAL_BASELINE.md`
- `docs/Chinese/mvp/PHASED_ENGINEERING_DELIVERY_PLAN.md`

Phase 0 baseline and inventory:

- `docs/Chinese/mvp/REBUILT_ENGINEERING_BASELINE.md`

Phase 0～2 technical debt register and current evidence:

- `docs/Chinese/mvp/TECHNICAL_DEBT_REGISTER_PHASE_0_TO_2.md`

Historical reference only:

- `docs/Chinese/mvp/TEMP_WORKSPACE_FIRST_REMEDIATION_PLAN.md`

Run `pnpm baseline:check` to verify both engineering boundaries and document consistency. Use `pnpm docs:check` when only the architecture, contract, phase, or reference-document invariants need to be checked.
