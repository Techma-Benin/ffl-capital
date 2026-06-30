import { PageHeader } from "@/components/ui/page-header";
import { Mail, Phone, MessageSquare } from "lucide-react";

export default function PartnerContactPage() {
  return (
    <div>
      <PageHeader
        title="Contact Us"
        subtitle="Reach out to the FFL Capital support team"
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {[
          {
            icon: Mail,
            title: "Email Support",
            desc: "For general questions and account matters",
            value: "support@fflcapital.com",
            action: "mailto:support@fflcapital.com",
            color: "text-brand-600 bg-brand-50",
          },
          {
            icon: Phone,
            title: "Phone",
            desc: "Mon–Fri, 9am–5pm EST",
            value: "+1 (888) FFL-LEAD",
            action: "tel:+18883355323",
            color: "text-emerald-600 bg-emerald-50",
          },
          {
            icon: MessageSquare,
            title: "Live Chat",
            desc: "Quick answers during business hours",
            value: "Start a chat →",
            action: "#",
            color: "text-violet-600 bg-violet-50",
          },
        ].map((c) => (
          <a
            key={c.title}
            href={c.action}
            className="card flex items-start gap-4 p-5 transition-all hover:shadow-card-hover"
          >
            <div className={`rounded-xl p-3 ${c.color}`}>
              <c.icon size={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{c.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{c.desc}</p>
              <p className="mt-2 text-sm font-medium text-brand-600">{c.value}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Message form */}
      <div className="card p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Send a Message</h2>
        <div className="grid gap-4 max-w-xl">
          <div>
            <label className="form-label">Subject</label>
            <select className="form-select">
              <option>Account question</option>
              <option>Refund request</option>
              <option>Lead quality issue</option>
              <option>Billing question</option>
              <option>Technical issue</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="form-label">Message</label>
            <textarea
              className="form-input min-h-[120px] resize-none"
              placeholder="Describe your issue or question…"
            />
          </div>
          <div>
            <button className="btn-primary">Send Message</button>
          </div>
        </div>
      </div>
    </div>
  );
}
