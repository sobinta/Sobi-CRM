import type { PlatformContext } from "./context";
import { ReadOnlyContextError } from "./errors";

export function assertWritableContext(ctx: PlatformContext): void {
  if (ctx.accessMode === "read-only") {
    throw new ReadOnlyContextError();
  }
}
