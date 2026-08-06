export type CategoryDiagnosticsSource = {
  type: string;
  enabled: boolean;
  criteria: Array<{ field: string; value: string }>;
};

export type DiagnosticField = {
  field: string;
  present: boolean;
  value: unknown;
};

export function buildCategoryPayloadDiagnostics(
  payload: Record<string, unknown>,
  categories: CategoryDiagnosticsSource[],
): DiagnosticField[] {
  const fields = new Set<string>();

  for (const category of categories) {
    if (!category.enabled) continue;
    for (const criterion of category.criteria) {
      fields.add(criterion.field);
    }
  }

  return Array.from(fields)
    .sort((a, b) => a.localeCompare(b))
    .map((field) => {
      const present = Object.prototype.hasOwnProperty.call(payload, field);
      return {
        field,
        present,
        value: present ? payload[field] : undefined,
      };
    });
}
