import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
  badge,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="section-header mb-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="page-title">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
