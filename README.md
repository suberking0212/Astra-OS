# AstraOS

AstraOS is an Enterprise AI Runtime.

AI Employee is a business application running on the Runtime. Agent is the decision-making part inside the Runtime, not the whole system.

## Current Scope

- JWT authentication
- Registration, login, email verification, and account identity
- Owner-scoped workspaces backed by `projects`
- Workspace frontend shell and visual foundation
- Planned button-to-API mappings for the future TaskRequest runtime

## Architecture

```text
Frontend（Workspace）
  -> API Layer（JWT / Auth / REST / WS / Organization / Marketplace API）
  -> AI Runtime
  -> Foundation Layer（LLM / Browser / MCP / Database / Redis / Storage）
```

Primary architecture source:

- `docs/Chinese/mvp/ARCHITECTURE_BASELINE.md`

Supporting engineering documents:

- `docs/Chinese/mvp/TEMP_WORKSPACE_FIRST_REMEDIATION_PLAN.md`
- `docs/Chinese/mvp/RUNTIME_REMEDIATION_SPEC.md`
- `docs/Chinese/mvp/WORKSPACE_VISUAL_BASELINE.md`
