import { Badge } from "@/components/ui/badge";
import {
  resolveLeadCategoryBadgeVariant,
  type LeadCategoryBadgeInput,
} from "@/lib/lead-categories/category-badge-variant";

export function LeadCategoryBadge({
  leadType,
  categoryResolution,
  leadTypeLabel,
  children,
  className,
}: LeadCategoryBadgeInput & {
  children: React.ReactNode;
  className?: string;
}) {
  const variant = resolveLeadCategoryBadgeVariant({
    leadType,
    categoryResolution,
    leadTypeLabel:
      leadTypeLabel ??
      (typeof children === "string" ? children : undefined),
  });

  return (
    <Badge variant={variant} className={className}>
      {children}
    </Badge>
  );
}
