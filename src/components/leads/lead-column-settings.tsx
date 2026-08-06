"use client";

import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { Sheet, SheetBody } from "@/components/ui/sheet";
import type { LeadColumnDef } from "@/lib/leads/list-view-columns";
import type { LeadViewColumn } from "@/lib/leads/list-view-schema";

export function LeadColumnSettings({
  open,
  onOpenChange,
  catalog,
  columns,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: LeadColumnDef[];
  columns: LeadViewColumn[];
  onChange: (columns: LeadViewColumn[]) => void;
}) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open, columns]);

  const ordered = useMemo(() => {
    const byKey = new Map(columns.map((c) => [c.key, c]));
    const list: LeadViewColumn[] = [];
    for (const c of columns) {
      if (catalog.some((d) => d.key === c.key)) list.push(c);
    }
    for (const d of catalog) {
      if (!byKey.has(d.key)) list.push({ key: d.key, visible: true });
    }
    return list;
  }, [columns, catalog]);

  const filtered = ordered.filter((col) => {
    const def = catalog.find((d) => d.key === col.key);
    const label = def?.label ?? col.key;
    return label.toLowerCase().includes(query.toLowerCase());
  });

  function toggle(key: string) {
    const def = catalog.find((d) => d.key === key);
    if (def?.required) return;
    onChange(
      ordered.map((c) =>
        c.key === key ? { ...c, visible: !c.visible } : c,
      ),
    );
  }

  function move(key: string, dir: -1 | 1) {
    const idx = ordered.findIndex((c) => c.key === key);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= ordered.length) return;
    const copy = [...ordered];
    const [item] = copy.splice(idx, 1);
    copy.splice(next, 0, item);
    onChange(copy);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Columns"
      description="Show, hide, and reorder table columns"
    >
      <SheetBody>
        <div className="relative mb-4">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search columns…"
            className="form-input w-full py-2 text-sm"
          />
        </div>
        <ul className="space-y-1">
          {filtered.map((col) => {
            const def = catalog.find((d) => d.key === col.key);
            const required = def?.required;
            return (
              <li
                key={col.key}
                className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-2"
              >
                <span className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 text-[10px] leading-none"
                    aria-label="Move up"
                    onClick={() => move(col.key, -1)}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 text-[10px] leading-none"
                    aria-label="Move down"
                    onClick={() => move(col.key, 1)}
                  >
                    ▼
                  </button>
                </span>
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    disabled={required}
                    onChange={() => toggle(col.key)}
                    className="rounded border-slate-300"
                  />
                  <span className={clsx(required && "text-slate-400")}>
                    {def?.label || col.key}
                    {required ? " (required)" : ""}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </SheetBody>
    </Sheet>
  );
}
