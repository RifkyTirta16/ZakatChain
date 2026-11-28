/**
 * Escapes a single cell for CSV output while neutralizing spreadsheet formula
 * injection (`=`, `+`, `-`, `@`, `\t`, `\r`).
 */
export const escapeCsvValue = (value: unknown): string => {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
};

export const buildCsvContent = (
  columns: readonly string[],
  rows: ReadonlyArray<Record<string, unknown>>
): string => {
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => escapeCsvValue(row[col])).join(','));
  return `\uFEFF${header}\n${lines.join('\n')}`;
};
