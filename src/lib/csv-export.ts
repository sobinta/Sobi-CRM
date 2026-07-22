/** Quote a CSV cell if it contains a comma, quote, or newline. */
function csvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a CSV string from row objects (using the given column order+labels)
 * and trigger a browser download. Client-side only — no server round trip.
 */
export function downloadCsv(
  filename: string,
  columns: { key: string; label: string }[],
  rows: Record<string, unknown>[],
): void {
  const header = columns.map((c) => csvCell(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => csvCell(String(row[c.key] ?? ""))).join(","),
  );
  const csv = [header, ...lines].join("\r\n");
  // BOM so Excel opens UTF-8 (Persian/German) text correctly.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
