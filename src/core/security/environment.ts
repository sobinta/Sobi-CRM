type Environment = Readonly<Record<string, string | undefined>>;

const PLACEHOLDER = /change[-_ ]?me|change.*prod|example|development|local-only/i;

function validSecret(value: string | undefined): boolean {
  return Boolean(value && value.length >= 32 && !PLACEHOLDER.test(value));
}

function validPostgresUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validHttpsUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validRedisUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return ["redis:", "rediss:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validEncryptionKey(value: string | undefined): boolean {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  return Buffer.from(value, "base64").length === 32;
}

export function productionEnvironmentProblems(env: Environment): string[] {
  const problems: string[] = [];
  for (const key of [
    "DATABASE_URL",
    "IDENTITY_DATABASE_URL",
    "SYSTEM_DATABASE_URL",
    "DIRECT_URL",
  ]) {
    if (!validPostgresUrl(env[key])) problems.push(`${key} must be a PostgreSQL URL`);
  }
  const databaseUrls = [
    env.DATABASE_URL,
    env.IDENTITY_DATABASE_URL,
    env.SYSTEM_DATABASE_URL,
    env.DIRECT_URL,
  ];
  if (databaseUrls.every(Boolean) && new Set(databaseUrls).size !== 4) {
    problems.push("database capabilities must use four distinct URLs/roles");
  }

  for (const key of [
    "BETTER_AUTH_SECRET",
    "FILE_SIGNING_SECRET",
    "JOB_RUNNER_SECRET",
  ]) {
    if (!validSecret(env[key])) problems.push(`${key} must be a non-placeholder 32+ character secret`);
  }
  if (!validEncryptionKey(env.FIELD_ENCRYPTION_KEY)) {
    problems.push("FIELD_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }
  if (!validHttpsUrl(env.BETTER_AUTH_URL)) problems.push("BETTER_AUTH_URL must use HTTPS");
  if (!validHttpsUrl(env.NEXT_PUBLIC_APP_URL)) {
    problems.push("NEXT_PUBLIC_APP_URL must use HTTPS");
  }
  if (env.WEBHOOK_ALLOW_PRIVATE_NETWORKS === "true") {
    problems.push("WEBHOOK_ALLOW_PRIVATE_NETWORKS cannot be enabled in production");
  }
  if (env.RATE_LIMIT_BACKEND !== "redis") {
    problems.push("RATE_LIMIT_BACKEND must be redis in production");
  }
  if (!validRedisUrl(env.RATE_LIMIT_REDIS_URL)) {
    problems.push("RATE_LIMIT_REDIS_URL must be a Redis URL");
  }
  if (env.FILE_STORAGE_DRIVER !== "s3") {
    problems.push("FILE_STORAGE_DRIVER must be s3 in production");
  }
  if (!env.FILE_STORAGE_S3_BUCKET) {
    problems.push("FILE_STORAGE_S3_BUCKET is required");
  }
  if (!env.FILE_STORAGE_S3_REGION) {
    problems.push("FILE_STORAGE_S3_REGION is required");
  }
  if (env.FILE_STORAGE_S3_ENDPOINT && !validHttpsUrl(env.FILE_STORAGE_S3_ENDPOINT)) {
    problems.push("FILE_STORAGE_S3_ENDPOINT must use HTTPS in production");
  }
  const accessKey = env.FILE_STORAGE_S3_ACCESS_KEY_ID;
  const secretKey = env.FILE_STORAGE_S3_SECRET_ACCESS_KEY;
  if (Boolean(accessKey) !== Boolean(secretKey)) {
    problems.push("S3 access key and secret key must be configured together");
  }
  if (env.FILE_STORAGE_S3_ENDPOINT && (!accessKey || !secretKey)) {
    problems.push("custom S3 endpoints require explicit credentials");
  }
  return problems;
}

export function assertProductionEnvironment(env: Environment): void {
  const problems = productionEnvironmentProblems(env);
  if (problems.length) {
    throw new Error(`Unsafe production environment: ${problems.join("; ")}`);
  }
}
