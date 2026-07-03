"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { ActionButton } from "@/components/ui/action-button";
import { StatusStrip } from "@/components/ui/status-strip";
import { usePartner } from "@/components/partner/partner-provider";
import { Mail, Send } from "lucide-react";

const SUPPORT_EMAIL = "support@fflcapital.com";

const SUBJECTS = [
  { value: "activation", label: "Account activation request" },
  { value: "account", label: "Account question" },
  { value: "refund", label: "Refund request" },
  { value: "lead-quality", label: "Lead quality issue" },
  { value: "billing", label: "Billing question" },
  { value: "technical", label: "Technical issue" },
  { value: "other", label: "Other" },
] as const;

type SubjectValue = (typeof SUBJECTS)[number]["value"];

function buildMailto(
  subjectValue: SubjectValue,
  message: string,
  partner: { id: string; email: string; firstName: string; lastName: string; status: string },
) {
  const subjectLabel = SUBJECTS.find((s) => s.value === subjectValue)?.label ?? "Support request";
  const subjectLine = `[Partner Portal] ${subjectLabel}`;
  const body = [
    message.trim(),
    "",
    "---",
    `Partner: ${partner.firstName} ${partner.lastName}`,
    `Email: ${partner.email}`,
    `Partner ID: ${partner.id}`,
    `Status: ${partner.status}`,
  ].join("\n");

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
}

export function PartnerContactView() {
  const { partner } = usePartner();
  const defaultSubject: SubjectValue =
    partner.status === "pending_approval" ? "activation" : "account";

  const [subject, setSubject] = useState<SubjectValue>(defaultSubject);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [opening, setOpening] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSent(false);

    if (!message.trim()) {
      setError("Please enter a message before sending.");
      return;
    }

    setOpening(true);
    window.location.href = buildMailto(subject, message, partner);
    setSent(true);
    setOpening(false);
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Contact Us"
        subtitle="Send a message to the FFL Capital support team"
      />

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-sm">
            <Mail size={16} />
          </div>
          <div className="min-w-0 text-sm">
            <p className="text-slate-500">Email</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-slate-900 hover:text-brand-600"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>

        <StatusStrip
          status={error ? "error" : sent ? "success" : null}
          title={error ? "Message required" : sent ? "Email client opened" : undefined}
          message={
            error
              ? error
              : sent
                ? "If your email app did not open, use the address above."
                : undefined
          }
          className="mb-6"
        />

        <div className="space-y-5">
          <div>
            <label htmlFor="contact-subject" className="form-label">
              Topic
            </label>
            <select
              id="contact-subject"
              className="form-select"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value as SubjectValue);
                setSent(false);
                setError("");
              }}
            >
              {SUBJECTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="contact-message" className="form-label">
              Message
            </label>
            <textarea
              id="contact-message"
              className="form-input min-h-[160px] resize-y"
              placeholder={
                subject === "activation"
                  ? "Hi — I completed onboarding and would like my account activated so I can start receiving leads."
                  : "Describe your question or issue…"
              }
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setSent(false);
                setError("");
              }}
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-400">
              {partner.firstName} {partner.lastName} · {partner.email}
            </p>
            <ActionButton
              type="submit"
              icon={<Send size={15} />}
              className="flex-shrink-0"
              loading={opening}
              loadingText="Opening email…"
            >
              Send
            </ActionButton>
          </div>
        </div>
      </form>
    </div>
  );
}
