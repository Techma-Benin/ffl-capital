export const CONTACT_TOPICS = [
  { value: "activation", label: "Account activation request" },
  { value: "account", label: "Account question" },
  { value: "refund", label: "Refund request" },
  { value: "lead-quality", label: "Lead quality issue" },
  { value: "billing", label: "Billing question" },
  { value: "technical", label: "Technical issue" },
  { value: "other", label: "Other" },
] as const;

export type ContactTopicValue = (typeof CONTACT_TOPICS)[number]["value"];

export const CONTACT_TOPIC_VALUES = CONTACT_TOPICS.map((t) => t.value) as [
  ContactTopicValue,
  ...ContactTopicValue[],
];

export function contactTopicLabel(value: ContactTopicValue): string {
  return CONTACT_TOPICS.find((t) => t.value === value)?.label ?? "Support request";
}
