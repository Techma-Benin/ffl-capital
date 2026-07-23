"use client";

export function FilterCheckboxGroup({
  label,
  options,
  selected,
  onToggle,
  scrollable,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  /** Cap height with vertical scroll for long option lists (e.g. all US states). */
  scrollable?: boolean;
}) {
  return (
    <div>
      <p className="form-label text-[10px]">{label}</p>
      <div
        className={`flex flex-wrap gap-2 ${scrollable ? "max-h-44 overflow-y-auto rounded-md border border-slate-100 p-2" : ""}`}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            <input
              type="checkbox"
              checked={selected.includes(o.value)}
              onChange={() => onToggle(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
