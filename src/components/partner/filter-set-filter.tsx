"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

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
  const router = useRouter();
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
    router.push(qs ? `${pathname}?${qs}` : pathname);
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
