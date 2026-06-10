import Papa from "papaparse";

export function parseCsv(text: string) {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  if (result.errors.length > 0) {
    throw new Error(result.errors[0]?.message || "CSV parse error");
  }
  return result.data;
}

export function toCsv(rows: Record<string, unknown>[]) {
  return Papa.unparse(rows);
}
