export function hasApiScope(
  grantedScopes: readonly string[],
  requiredScope: string,
): boolean {
  const required = requiredScope.trim().toLowerCase();
  const [resource, action] = required.split(":", 2);
  const granted = new Set(grantedScopes.map((scope) => scope.trim().toLowerCase()));
  return (
    granted.has("*") ||
    granted.has(required) ||
    granted.has(`${resource}:*`) ||
    (action === "read" && granted.has("read")) ||
    (action !== "read" && granted.has("write"))
  );
}
