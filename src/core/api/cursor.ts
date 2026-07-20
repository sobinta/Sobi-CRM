export function encodeCursor(id: string): string {
  return Buffer.from(id, "utf8").toString("base64url");
}

export function decodeCursor(value: string | null): string | undefined {
  if (!value || value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) return undefined;
  try {
    const id = Buffer.from(value, "base64url").toString("utf8");
    return /^[A-Za-z0-9_-]{8,64}$/.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}
