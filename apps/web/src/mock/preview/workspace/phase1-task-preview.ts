export type TaskUiStatus =
  | "idle"
  | "thinking"
  | "running"
  | "needs_context"
  | "needs_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type ConversationMessageView = {
  id: string;
  role: "user" | "assistant" | "system";
  kind: "message" | "thinking" | "context_request" | "approval" | "result";
  title: string | null;
  body: string;
  createdAt: string;
};

export type TaskTimelineItemView = {
  id: string;
  label: string;
  description: string;
  status: "pending" | "active" | "done" | "blocked" | "failed";
  timestamp: string | null;
};

export type TaskTimelineView = {
  taskId: string;
  items: TaskTimelineItemView[];
};

export type AttentionFieldView = {
  id: string;
  label: string;
  value: string;
};

export type ContextRequestFormView = {
  id: string;
  title: string;
  description: string;
  fields: AttentionFieldView[];
  submitLabel: string;
};

export type ApprovalCardView = {
  id: string;
  title: string;
  description: string;
  riskLevel: "low" | "medium" | "high";
  businessImpact: string;
  approveLabel: string;
  rejectLabel: string;
};

export type ResultSummaryView = {
  id: string;
  title: string;
  summary: string;
  objects: Array<{
    label: string;
    value: string;
  }>;
  nextActions: string[];
};

export type WorkspacePhase1Preview = {
  workspace: {
    id: string;
    name: string;
  };
  composer: {
    placeholder: string;
    suggestedPrompts: string[];
    acceptsAttachments: boolean;
    disabledReason: string | null;
  };
  activeTask: {
    id: string;
    title: string;
    userIntent: string;
    status: TaskUiStatus;
    statusLabel: string;
    progressSummary: string;
    startedAt: string;
    updatedAt: string;
  };
  conversation: ConversationMessageView[];
  timeline: TaskTimelineView;
  contextRequest: ContextRequestFormView;
  approval: ApprovalCardView;
  riskNotice: string;
  result: ResultSummaryView;
  failureState: {
    title: string;
    body: string;
  };
  cancelState: {
    title: string;
    body: string;
  };
};

export const phase1WorkspacePreview: WorkspacePhase1Preview = {
  workspace: {
    id: "ws_demo",
    name: "Acme Workspace",
  },
  composer: {
    placeholder: "Describe your task to get started...",
    suggestedPrompts: [
      "Summarize this customer conversation",
      "Draft a reply for this support case",
      "Create a follow-up task from these notes",
    ],
    acceptsAttachments: true,
    disabledReason: null,
  },
  activeTask: {
    id: "task_demo_001",
    title: "Draft a reply for a customer issue",
    userIntent:
      "Help me respond to a customer who says last week's device order never arrived and sounds urgent.",
    status: "needs_approval",
    statusLabel: "Waiting for your confirmation",
    progressSummary:
      "AstraOS has collected the customer details, drafted a reply, and is asking before creating a follow-up item.",
    startedAt: "2026-07-14T10:00:00Z",
    updatedAt: "2026-07-14T10:06:00Z",
  },
  conversation: [
    {
      id: "msg_user_001",
      role: "user",
      kind: "message",
      title: null,
      body:
        "帮我处理这个客户投诉。客户说上周下单的设备没有收到，而且语气很着急。",
      createdAt: "10:00",
    },
    {
      id: "msg_assistant_001",
      role: "assistant",
      kind: "message",
      title: null,
      body:
        "我会先判断问题类型、整理客户诉求，再准备一份可直接发送的回复草稿。",
      createdAt: "10:01",
    },
    {
      id: "msg_assistant_002",
      role: "assistant",
      kind: "context_request",
      title: "More information needed",
      body:
        "我还需要订单号或客户邮箱，才能确认是否要创建后续跟进事项。",
      createdAt: "10:02",
    },
    {
      id: "msg_system_001",
      role: "system",
      kind: "thinking",
      title: "Reasoning preview",
      body:
        "客户的问题包含物流状态不明和情绪安抚两部分。我会优先生成一段可直接发送的回复，并建议创建一个内部跟进事项。",
      createdAt: "10:04",
    },
    {
      id: "msg_assistant_003",
      role: "assistant",
      kind: "approval",
      title: "Confirm follow-up",
      body:
        "是否创建一个 Support follow-up item？这会保存客户邮箱、订单号和问题摘要，供支持团队后续处理。",
      createdAt: "10:05",
    },
    {
      id: "msg_assistant_004",
      role: "assistant",
      kind: "result",
      title: "Task result",
      body:
        "客户回复草稿已准备好，并附带建议的跟进事项、风险说明和下一步建议。",
      createdAt: "10:06",
    },
  ],
  timeline: {
    taskId: "task_demo_001",
    items: [
      {
        id: "timeline_001",
        label: "Request understood",
        description: "Identified the customer issue and the desired outcome.",
        status: "done",
        timestamp: "10:01",
      },
      {
        id: "timeline_002",
        label: "Customer details collected",
        description: "Captured email, order number, priority, and preferred tone.",
        status: "done",
        timestamp: "10:03",
      },
      {
        id: "timeline_003",
        label: "Reply drafted",
        description: "Prepared a customer-facing response with an empathetic tone.",
        status: "done",
        timestamp: "10:04",
      },
      {
        id: "timeline_004",
        label: "Follow-up task ready",
        description: "Waiting for confirmation before creating the support follow-up item.",
        status: "active",
        timestamp: "10:05",
      },
      {
        id: "timeline_005",
        label: "Result ready",
        description: "The final reply, risk note, and next steps are ready to review.",
        status: "pending",
        timestamp: null,
      },
    ],
  },
  contextRequest: {
    id: "context_001",
    title: "Add customer details",
    description:
      "These fields let AstraOS prepare a useful reply and decide whether a support follow-up is needed.",
    submitLabel: "Continue",
    fields: [
      {
        id: "field_email",
        label: "Customer email",
        value: "alex@example.com",
      },
      {
        id: "field_order",
        label: "Order number",
        value: "ACME-10492",
      },
      {
        id: "field_priority",
        label: "Priority",
        value: "Urgent",
      },
      {
        id: "field_tone",
        label: "Preferred tone",
        value: "Calm and apologetic",
      },
    ],
  },
  approval: {
    id: "approval_001",
    title: "Create a support follow-up item?",
    description:
      "AstraOS will create a support follow-up item containing the customer email, order number, and issue summary.",
    riskLevel: "medium",
    businessImpact:
      "The support team will receive a follow-up item tied to this customer complaint.",
    approveLabel: "Looks good",
    rejectLabel: "Not now",
  },
  riskNotice:
    "Shipping status is not confirmed yet. The reply should avoid promising a delivery date until the support team verifies the order.",
  result: {
    id: "result_001",
    title: "Customer reply and follow-up ready",
    summary:
      "A calm apology, a request for verification, and a prepared internal follow-up are ready for review.",
    objects: [
      {
        label: "Customer reply draft",
        value:
          "Thanks for flagging this. I am sorry the device has not arrived yet. We are checking the order now and will follow up with the next update as soon as possible.",
      },
      {
        label: "Prepared follow-up",
        value:
          "Support follow-up item for alex@example.com, order ACME-10492, urgent delivery complaint.",
      },
      {
        label: "Risk note",
        value:
          "Do not promise a replacement or exact delivery time before the order is verified.",
      },
    ],
    nextActions: [
      "Send the reply draft to the customer.",
      "Confirm the order status with support.",
      "Update the customer when shipping information is verified.",
    ],
  },
  failureState: {
    title: "Could not continue",
    body:
      "AstraOS could not prepare a reliable reply because the customer message was missing. Add the message and try again.",
  },
  cancelState: {
    title: "Task cancelled",
    body:
      "The task was stopped before creating any support follow-up or customer-facing reply.",
  },
};
