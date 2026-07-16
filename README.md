# AstraOS

AstraOS is an Enterprise AI Operating System.

AI Employee is an enterprise business responsibility and governance object defined by the AstraOS Control Plane and operated by the AstraOS Managed Runtime. Hermes / Agent Runtime is a replaceable execution backend, not the whole system.

## Current Scope

- JWT authentication
- Registration, login, email verification, and account identity
- Owner-scoped workspaces backed by `projects`
- Workspace frontend shell backed only by the Auth and Project APIs
- Preview assets isolated from production and disabled by default

Task execution, Interaction Runtime, Presentation View Models, and Executors are not part of the current production path.

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

1. Stops API, Web, and log processes recorded by the previous run, then releases the configured API and Web ports.
2. Creates `.env` from `.env.example` when `.env` does not exist.
3. Starts PostgreSQL and Qdrant with Docker Compose and waits for them to become healthy.
4. Installs frontend dependencies when they are missing.
5. Creates `services/api/.venv` when needed and installs backend dependencies.
6. Applies all Alembic database migrations.
7. Starts FastAPI and Next.js, then waits for both applications to respond.

Process IDs are stored under `.logs/pids/`. Starting the script again automatically stops the previous FastAPI and Next.js processes before creating new ones. Processes occupying the configured ports are also terminated as a fallback.

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
PYTHON_BIN=python3.12 ./scripts/dev.sh
API_LOG_LEVEL=info ./scripts/dev.sh
```

To enable the isolated product-shape Preview for local development, set this in `.env` before starting:

```text
ENABLE_WORKSPACE_PREVIEWS=true
```

Preview assets are disabled by default and are not part of the production Workspace data path.

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
  -> Foundation Layer（LLM / Browser / MCP / Database / Redis / Storage）
```

Agent Runtime is an autonomous execution unit. AI Employee is an enterprise business responsibility and governance object. Employee Execution Profile selects and constrains the Executor through Task Routing Configuration.

AstraOS does not build a second model-execution Agent Harness. Hermes and other Agent Runtimes own the model decision loop, executor-local context, tool-calling loop, Skills, Subagents and model adapters. AstraOS Governance Harness Services manage execution boundaries, while the Managed Runtime manages durable tasks, interactions, recovery and cross-executor coordination.

Tools are governed capabilities requested by Executors through the AstraOS Tool Gateway. Tools are not independent Executor types.

Primary architecture source:

- `docs/Chinese/mvp/ARCHITECTURE_BASELINE.md`

Authoritative supporting documents, in precedence order:

- `docs/Chinese/mvp/TASK_PRESENTATION_CONTRACT.md`
- `docs/Chinese/mvp/RUNTIME_REMEDIATION_SPEC.md`
- `docs/Chinese/mvp/WORKSPACE_VISUAL_BASELINE.md`
- `docs/Chinese/mvp/PHASED_ENGINEERING_DELIVERY_PLAN.md`

Phase 0 baseline and inventory:

- `docs/Chinese/mvp/REBUILT_ENGINEERING_BASELINE.md`

Historical reference only:

- `docs/Chinese/mvp/TEMP_WORKSPACE_FIRST_REMEDIATION_PLAN.md`

Run `pnpm baseline:check` to verify both engineering boundaries and document consistency. Use `pnpm docs:check` when only the architecture, contract, phase, or reference-document invariants need to be checked.
