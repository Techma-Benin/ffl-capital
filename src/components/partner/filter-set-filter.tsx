"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useNavigateWithPending } from "@/hooks/use-navigate-with-pending";

type FilterSetOption = {
  id: string;
  name: string;
  leadType: string;
  active: boolean;
};

export function FilterSetFilter({
  filterSets,
  currentFilterSetId,
}: {
  filterSets: FilterSetOption[];
  currentFilterSetId: string | null;
}) {
  const { push } = useNavigateWithPending();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page"); // reset to page 1 on filter change
    if (value) {
      params.set("filterSetId", value);
    } else {
      params.delete("filterSetId");
    }
    const qs = params.toString();
    push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <select
      className="form-select py-1.5 text-sm w-auto min-w-[160px]"
      value={currentFilterSetId ?? ""}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="">All filter sets</option>
      {filterSets.map((fs) => (
        <option key={fs.id} value={fs.id}>
          {fs.name}
          {!fs.active ? " (inactive)" : ""}
        </option>
      ))}
    </select>
  );
}
