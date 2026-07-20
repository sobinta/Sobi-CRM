const CONTRACT_TOKEN = /^[A-Za-z0-9_-]{32}$/;

export function isContractShareToken(token: string): boolean {
  return CONTRACT_TOKEN.test(token);
}

export function contractTokenExpiry(from = new Date()): Date {
  const configured = Number(process.env.CONTRACT_TOKEN_TTL_DAYS ?? 30);
  const days = Number.isFinite(configured)
    ? Math.max(1, Math.min(90, Math.floor(configured)))
    : 30;
  return new Date(from.getTime() + days * 86_400_000);
}
