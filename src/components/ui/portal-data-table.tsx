import { clsx } from "clsx";
import { PortalDataTableTab } from "@/components/ui/portal-data-table-tab";
import {
  PortalSortableHeaderCell,
  PortalTableHeaderCell,
  type SortDirection,
} from "@/components/ui/portal-sortable-table-header";

export type PortalDataTableColumn = {
  key: string;
  label: string;
  headerClassName?: string;
  /** When set, column header is sortable (requires `sort` on the table). */
  sortKey?: string;
};

export type PortalDataTableSortState = {
  active?: string;
  dir: SortDirection;
  hrefBySortKey: Record<string, string>;
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

export function PortalDataTableTabs({ tabs }: { tabs: PortalDataTableTabConfig[] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 px-1 py-2">
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
  );
}

/** Tabs + table on page background — same shell as partner My Leads (no outer white card). */
export function PortalDataTableCard({
  tabs,
  tabsSlot,
  footer,
  children,
  className,
}: {
  tabs?: PortalDataTableTabConfig[];
  /** Replaces default tab row (e.g. tabs + inline filters). */
  tabsSlot?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex min-h-0 flex-col", className)}>
      {tabsSlot ? (
        <div className="shrink-0">{tabsSlot}</div>
      ) : (
        tabs && tabs.length > 0 ? <PortalDataTableTabs tabs={tabs} /> : null
      )}
      {children}
      {footer}
    </div>
  );
}

export function PortalDataTable({
  columns,
  children,
  className,
  sort,
}: {
  columns: PortalDataTableColumn[];
  children: React.ReactNode;
  className?: string;
  sort?: PortalDataTableSortState;
}) {
  return (
    <div className={clsx("min-h-0 flex-1 pb-2 pt-1", className)}>
      <table className="w-full border-separate border-spacing-y-2">
        <thead>
          <tr>
            {columns.map((col) => {
              if (col.sortKey && sort?.hrefBySortKey[col.sortKey]) {
                return (
                  <PortalSortableHeaderCell
                    key={col.key}
                    label={col.label}
                    href={sort.hrefBySortKey[col.sortKey]}
                    active={sort.active === col.sortKey}
                    dir={sort.dir}
                    headerClassName={col.headerClassName}
                  />
                );
              }
              return (
                <PortalTableHeaderCell
                  key={col.key}
                  label={col.label}
                  headerClassName={col.headerClassName}
                />
              );
            })}
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
