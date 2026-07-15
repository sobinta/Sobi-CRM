"use server";

import { z } from "zod";
import { acceptContractPublic } from "@/engines/contracts/contract-service";

const schema = z.object({
  token: z.string().min(1),
  name: z.string().trim().min(2),
});

export async function acceptContractAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const };
  const res = await acceptContractPublic(parsed.data.token, parsed.data.name);
  return res;
}
