from dataclasses import dataclass, field
from typing import Any


@dataclass
class MockInteraction:
    id: str
    kind: str
    reason_code: str
    schema: dict[str, Any] = field(default_factory=dict)
    payload: dict[str, Any] = field(default_factory=dict)
    actions: list[str] = field(default_factory=list)
    risk_level: str = "none"


@dataclass
class MockResult:
    status: str
    summary: str
    failure_reason: str | None = None
    objects: list[dict[str, str]] = field(default_factory=list)


@dataclass
class MockTask:
    id: str
    workspace_id: str
    intent: str
    status: str
    created_at: str
    updated_at: str
    interactions: list[MockInteraction] = field(default_factory=list)
    facts: dict[str, str] = field(default_factory=dict)
    result: MockResult | None = None
