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
  /** Custom header content (e.g. column picker); sortable columns use label only. */
  headerContent?: React.ReactNode;
};

export type PortalDataTableSortState = {
  active?: string;
  dir: SortDirection;
  /** Server navigation sort links. Prefer `onSortKey` for client-side sort. */
  hrefBySortKey?: Record<string, string>;
  /** Client-side sort callback (no router navigation). */
  onSortKey?: (sortKey: string) => void;
};

export type PortalDataTableLayout = "cards" | "table";

export const portalTableCell = "px-4 py-3.5";
export const portalTableCellFirst = "rounded-l-xl px-4 py-3.5";
export const portalTableCellLast = "rounded-r-xl px-4 py-3.5";

export function portalTableRowClassName(
  className?: string,
  layout: PortalDataTableLayout = "cards",
) {
  if (layout === "table") {
    return clsx("group", className);
  }
  return clsx(
    "bg-white shadow-sm hover:shadow-md transition-all group",
    className,
  );
}

export function portalTableDataCellClassName(
  layout: PortalDataTableLayout,
  options?: { first?: boolean; last?: boolean; className?: string },
) {
  if (layout === "table") {
    return options?.className;
  }
  const base = options?.first
    ? portalTableCellFirst
    : options?.last
      ? portalTableCellLast
      : portalTableCell;
  return clsx(base, options?.className);
}

/** Card rows: hide kebab until hover/focus; table layout keeps controls visible. */
export function portalRowKebabTriggerClassName(
  layout: PortalDataTableLayout,
  options?: { revealed?: boolean },
): string {
  const base =
    "flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-opacity";
  if (layout === "table") {
    return clsx(base, "transition-colors");
  }
  return clsx(
    base,
    options?.revealed
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
  );
}

/** Actions cell: reveal kebab when any control inside has focus (keyboard). */
export function portalRowActionsCellClassName(
  layout: PortalDataTableLayout,
  cellClassName?: string,
) {
  return clsx(
    cellClassName,
    layout === "cards" && "focus-within:[&_button]:opacity-100",
  );
}

export type PortalDataTableTabConfig = {
  label: string;
  href?: string;
  onClick?: () => void;
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
          onClick={tab.onClick}
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
  layout = "cards",
  footer,
}: {
  columns: PortalDataTableColumn[];
  children: React.ReactNode;
  className?: string;
  sort?: PortalDataTableSortState;
  layout?: PortalDataTableLayout;
  /** Rendered below the table; for `layout="table"` sits inside the white card (e.g. pagination). */
  footer?: React.ReactNode;
}) {
  const table = (
    <table
      className={clsx(
        "w-full",
        layout === "cards"
          ? "border-separate border-spacing-y-2"
          : "data-table data-table-grid",
      )}
    >
      <thead>
        <tr>
          {columns.map((col) => {
            const canSort =
              col.sortKey &&
              (sort?.onSortKey || sort?.hrefBySortKey?.[col.sortKey]);
            if (col.sortKey && canSort) {
              return (
                <PortalSortableHeaderCell
                  key={col.key}
                  label={col.label}
                  href={
                    sort?.onSortKey
                      ? undefined
                      : sort?.hrefBySortKey?.[col.sortKey]
                  }
                  onClick={
                    sort?.onSortKey
                      ? () => sort.onSortKey!(col.sortKey!)
                      : undefined
                  }
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
              >
                {col.headerContent}
              </PortalTableHeaderCell>
            );
          })}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );

  if (layout === "table") {
    return (
      <div className={clsx("card shrink-0 overflow-hidden", className)}>
        <div className="overflow-x-auto">{table}</div>
        {footer}
      </div>
    );
  }

  return (
    <div className={clsx("min-h-0 flex-1 pb-2 pt-1", className)}>{table}</div>
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
