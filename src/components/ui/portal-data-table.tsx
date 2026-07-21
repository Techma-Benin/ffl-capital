import { clsx } from "clsx";
import { PortalDataTableTab } from "@/components/ui/portal-data-table-tab";

export type PortalDataTableColumn = {
  key: string;
  label: string;
  headerClassName?: string;
};

export const portalTableCell = "px-4 py-3.5";
export const portalTableCellFirst = "rounded-l-xl px-4 py-3.5";
export const portalTableCellLast = "rounded-r-xl px-4 py-3.5";

export function portalTableRowClassName(className?: string) {
  return clsx(
    "bg-white shadow-sm hover:shadow-md transition-all group",
    className,
  );
}

export type PortalDataTableTabConfig = {
  label: string;
  href: string;
  active: boolean;
  count?: number;
};

export function PortalDataTableCard({
  tabs,
  footer,
  children,
  className,
}: {
  tabs?: PortalDataTableTabConfig[];
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("card", className)}>
      {tabs && tabs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          {tabs.map((tab) => (
            <PortalDataTableTab
              key={tab.label}
              href={tab.href}
              active={tab.active}
              count={tab.count}
            >
              {tab.label}
            </PortalDataTableTab>
          ))}
        </div>
      )}
      {children}
      {footer}
    </div>
  );
}

export function PortalDataTable({
  columns,
  children,
}: {
  columns: PortalDataTableColumn[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto px-2 pb-2 pt-1">
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  "whitespace-nowrap px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-orange-600/70",
                  col.headerClassName,
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** Primary + secondary line in a name column (matches partner leads). */
export function PortalTablePrimaryCell({
  primary,
  secondary,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
}) {
  return (
    <>
      <p className="font-semibold text-slate-900">{primary}</p>
      {secondary != null && secondary !== "" && (
        <p className="text-sm text-slate-500">{secondary}</p>
      )}
    </>
  );
}
