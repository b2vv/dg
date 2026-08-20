export class ParseJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseJsonError';
  }
}

export type ParseJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ParseJsonError };

export function parseJsonText<T>(text: string): ParseJsonResult<T> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: new ParseJsonError('Empty file') };
  }
  try {
    const data = JSON.parse(trimmed) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: new ParseJsonError('Invalid JSON') };
  }
}

export async function parseJsonFile<T>(file: File): Promise<ParseJsonResult<T>> {
  const text = await file.text();
  return parseJsonText<T>(text);
}
