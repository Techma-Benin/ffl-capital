"use client";

import { Badge } from "@/components/ui/badge";
import type { DiagnosticField } from "@/lib/lead-categories/payload-diagnostics";

function highlightJson(
  payload: Record<string, unknown>,
  diagnosticFields: DiagnosticField[],
): string {
  const highlightFields = new Set(
    diagnosticFields.filter((field) => field.present).map((field) => field.field),
  );
  const json = JSON.stringify(payload, null, 2);
  if (highlightFields.size === 0) return json;

  return json
    .split("\n")
    .map((line) => {
      for (const field of highlightFields) {
        const keyPattern = `"${field}"`;
        if (line.includes(keyPattern)) {
          return `>>> ${line}`;
        }
      }
      return line;
    })
    .join("\n");
}

export function CategoryPayloadViewer({
  payload,
  diagnosticFields,
  candidateLabels,
}: {
  payload: Record<string, unknown>;
  diagnosticFields: DiagnosticField[];
  candidateLabels?: string[];
}) {
  const highlightedJson = highlightJson(payload, diagnosticFields);

  return (
    <div className="space-y-4">
      {candidateLabels && candidateLabels.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Candidate categories
          </p>
          <div className="flex flex-wrap gap-2">
            {candidateLabels.map((label) => (
              <Badge key={label} variant="yellow">
                {label}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {diagnosticFields.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Categorization fields
          </p>
          <div className="flex flex-wrap gap-2">
            {diagnosticFields.map((field) => (
              <Badge
                key={field.field}
                variant={field.present ? "green" : "slate"}
                title={
                  field.present
                    ? `${field.field}: ${String(field.value)}`
                    : `${field.field}: missing from payload`
                }
              >
                {field.field}
                {field.present ? "" : " (missing)"}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <pre className="overflow-x-auto rounded-lg bg-slate-50 p-4 text-xs text-slate-700">
        {highlightedJson}
      </pre>
    </div>
  );
}
