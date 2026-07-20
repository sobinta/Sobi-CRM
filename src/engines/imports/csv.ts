export class CsvImportError extends Error {}

const MAX_ROWS = 2_000;
const MAX_COLUMNS = 50;
const MAX_CELL_LENGTH = 4_000;

export function parseCsv(text: string): string[][] {
  if (text.includes("\0")) throw new CsvImportError("CSV contains a NUL byte.");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const pushCell = () => {
    if (cell.length > MAX_CELL_LENGTH) throw new CsvImportError("CSV cell is too long.");
    row.push(cell);
    cell = "";
    if (row.length > MAX_COLUMNS) throw new CsvImportError("CSV has too many columns.");
  };
  const pushRow = () => {
    pushCell();
    if (row.some((value) => value.length > 0)) rows.push(row);
    row = [];
    if (rows.length > MAX_ROWS + 1) throw new CsvImportError("CSV has too many rows.");
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === ",") {
      pushCell();
    } else if (char === "\n") {
      pushRow();
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (quoted) throw new CsvImportError("CSV has an unterminated quote.");
  if (cell.length || row.length) pushRow();
  if (rows.length < 2) throw new CsvImportError("CSV needs a header and at least one row.");
  return rows;
}

export const CONTACT_IMPORT_FIELDS = [
  "firstName", "lastName", "email", "phone", "jobTitle", "lifecycle", "source",
] as const;
export type ContactImportField = typeof CONTACT_IMPORT_FIELDS[number];

export function normalizeContactMapping(
  headers: string[],
  requested: unknown,
): Partial<Record<ContactImportField, number>> {
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  const aliases: Record<ContactImportField, string[]> = {
    firstName: ["firstname", "first_name", "first name", "name"],
    lastName: ["lastname", "last_name", "last name", "surname"],
    email: ["email", "email_address"],
    phone: ["phone", "mobile", "telephone"],
    jobTitle: ["jobtitle", "job_title", "title"],
    lifecycle: ["lifecycle", "stage"],
    source: ["source"],
  };
  const explicit = requested && typeof requested === "object"
    ? requested as Record<string, unknown>
    : {};
  const result: Partial<Record<ContactImportField, number>> = {};
  for (const field of CONTACT_IMPORT_FIELDS) {
    const requestedHeader = explicit[field];
    const index = typeof requestedHeader === "string"
      ? normalizedHeaders.indexOf(requestedHeader.trim().toLowerCase())
      : normalizedHeaders.findIndex((header) => aliases[field].includes(header));
    if (index >= 0) result[field] = index;
  }
  if (result.firstName === undefined || result.lastName === undefined) {
    throw new CsvImportError("firstName and lastName mappings are required.");
  }
  return result;
}
