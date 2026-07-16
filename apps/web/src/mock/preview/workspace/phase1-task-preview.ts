import type {
  HistoryTaskView,
  TaskComposerView,
  WorkspacePreviewStateView,
  WorkspaceTaskView,
} from "@/features/workspace/contract/view-model";

export type WorkspacePhase1Preview = {
  workspace: {
    id: string;
    name: string;
  };
  statusLabel: string;
  previewStates: WorkspacePreviewStateView[];
  composer: TaskComposerView;
  activeTask: WorkspaceTaskView;
  history: HistoryTaskView[];
};

export const phase1WorkspacePreview: WorkspacePhase1Preview = {
  workspace: {
    id: "ws_demo",
    name: "Acme Workspace",
  },
  statusLabel: "Phase 1 Preview",
  previewStates: [
    {
      id: "state_context",
      label: "needs_context",
      status: "needs_context",
      summary: "Requires customer details.",
    },
    {
      id: "state_approval",
      label: "needs_approval",
      status: "needs_approval",
      summary: "Requires approval before follow-up.",
    },
    {
      id: "state_completed",
      label: "completed",
      status: "completed",
      summary: "Reply and result are ready.",
    },
    {
      id: "state_failed",
      label: "failed",
      status: "failed",
      summary: "Missing customer message prevents drafting.",
    },
    {
      id: "state_cancelled",
      label: "cancelled",
      status: "cancelled",
      summary: "Task stopped before any side effect.",
    },
  ],
  composer: {
    currentRequirement: "Delegate one customer support task without exposing Runtime internals.",
    placeholder: "Describe the customer issue, desired outcome, and any known constraints.",
    prefill: "帮我处理这个客户投诉。客户说上周下单的设备没有收到，而且语气很着急。",
    suggestedPrompts: [
      "Summarize the customer complaint",
      "Draft a customer-facing reply",
      "Prepare a support follow-up suggestion",
    ],
    supportsAttachments: true,
    disabled: false,
    disabledReason: null,
    submitLabel: "Submit task",
    addContextLabel: "Add context",
  },
  activeTask: {
    id: "task_demo_001",
    title: "Customer complaint reply and follow-up suggestion",
    userIntent: "Help me respond to a customer who says last week's device order never arrived and sounds urgent.",
    status: "needs_approval",
    statusLabel: "Needs your attention",
    progressSummary:
      "AstraOS has understood the complaint, collected key details, prepared a reply draft, and is waiting before creating a support follow-up item.",
    updatedAt: "Updated 10:06",
    understanding: [
      "The customer is reporting a missing delivery and expects a timely response.",
      "The reply should acknowledge urgency without promising an unverified shipping outcome.",
      "A support follow-up item may help the team verify the order and continue the case.",
    ],
    facts: [
      { label: "Customer email", value: "alex@example.com" },
      { label: "Order number", value: "ACME-10492" },
      { label: "Priority", value: "Urgent" },
      { label: "Preferred tone", value: "Calm and apologetic" },
    ],
    progress: {
      summary: "The current product shape explains progress in business language rather than Runtime events.",
      currentStep: "Waiting for follow-up approval",
      completedSteps: 4,
      totalSteps: 5,
      updatedAt: "10:06",
      items: [
        {
          id: "timeline_001",
          label: "Task understood",
          description: "AstraOS identified the customer issue and the expected business outcome.",
          status: "completed",
          timestamp: "10:01",
        },
        {
          id: "timeline_002",
          label: "Context added",
          description: "Customer email, order number, priority, and tone were gathered.",
          status: "completed",
          timestamp: "10:03",
        },
        {
          id: "timeline_003",
          label: "Reply drafted",
          description: "A customer-facing draft was prepared in an empathetic tone.",
          status: "completed",
          timestamp: "10:04",
        },
        {
          id: "timeline_004",
          label: "Approval requested",
          description: "AstraOS is asking before creating a support follow-up item.",
          status: "running",
          timestamp: "10:05",
        },
        {
          id: "timeline_005",
          label: "Result delivered",
          description: "The final result will include the reply, the risk note, and the next actions.",
          status: "pending",
          timestamp: null,
        },
      ],
    },
    interactions: [
      {
        id: "interaction_input_001",
        taskId: "task_demo_001",
        kind: "input",
        title: "Provide missing customer details",
        body: "These details let AstraOS prepare a more useful reply and decide whether follow-up is needed.",
        fields: [
          {
            key: "customer_email",
            label: "Customer email",
            type: "text",
            required: true,
            placeholder: "alex@example.com",
            value: "alex@example.com",
          },
          {
            key: "order_number",
            label: "Order number",
            type: "text",
            required: true,
            placeholder: "ACME-10492",
            value: "ACME-10492",
          },
        ],
        options: [],
        actions: [
          { action: "submit", label: "Continue", emphasis: "primary" },
          { action: "cancel", label: "Cancel task", emphasis: "secondary" },
        ],
        riskLevel: "none",
        expiresAt: null,
        statusLabel: "needs_context",
        responseSummary: "In the preview, the required context has already been filled to show the next state.",
      },
      {
        id: "interaction_approval_001",
        taskId: "task_demo_001",
        kind: "approval",
        title: "Create a support follow-up item?",
        body: "AstraOS will save the customer email, order number, and issue summary so the support team can continue the case.",
        fields: [],
        options: [],
        actions: [
          { action: "approve", label: "Approve action", emphasis: "primary" },
          { action: "reject", label: "Reject for now", emphasis: "danger" },
        ],
        riskLevel: "medium",
        expiresAt: null,
        statusLabel: "needs_approval",
        emphasisNote:
          "Shipping status is not confirmed yet. The reply should avoid promising a delivery date until support verifies the order.",
      },
    ],
    result: {
      status: "succeeded",
      resultType: "customer_support_reply",
      title: "Customer reply and follow-up ready",
      summary:
        "A calm apology, a verification request, and a prepared internal follow-up are ready for review.",
      businessObjects: [
        {
          type: "reply_draft",
          id: "reply_001",
          label: "Customer reply draft",
          url: null,
          value:
            "Thanks for flagging this. I am sorry the device has not arrived yet. We are checking the order now and will follow up with the next update as soon as possible.",
        },
        {
          type: "support_follow_up",
          id: "follow_up_001",
          label: "Prepared follow-up",
          url: null,
          value: "Support follow-up item for alex@example.com, order ACME-10492, urgent delivery complaint.",
        },
        {
          type: "risk_note",
          id: "risk_001",
          label: "Risk note",
          url: null,
          value: "Do not promise a replacement or exact delivery time before the order is verified.",
        },
      ],
      nextActions: [
        "Send the reply draft to the customer.",
        "Confirm the order status with support.",
        "Update the customer when shipping information is verified.",
      ],
      failureReason: null,
    },
  },
  history: [
    {
      id: "history_001",
      title: "Missing message prevented drafting",
      status: "failed",
      summary: "AstraOS could not prepare a reliable reply because the customer message was missing.",
      updatedAt: "Earlier failure sample",
      resultStatus: "failed",
    },
    {
      id: "history_002",
      title: "Task cancelled before follow-up",
      status: "cancelled",
      summary: "The task was stopped before any support follow-up or customer-facing reply was created.",
      updatedAt: "Cancellation sample",
      resultStatus: "cancelled",
    },
    {
      id: "history_003",
      title: "Refund clarification completed",
      status: "completed",
      summary: "A previous refund request was completed after the customer confirmed the order details.",
      updatedAt: "Completed sample",
      resultStatus: "succeeded",
    },
  ],
};
