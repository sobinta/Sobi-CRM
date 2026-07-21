export function isAllowedDemoAuthPost(pathname: string): boolean {
  return pathname.endsWith("/sign-out");
}
