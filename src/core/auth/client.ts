"use client";

import { createAuthClient } from "better-auth/react";

// No baseURL → the client targets the same origin it's served from. This keeps
// auth working regardless of the dev port (autoPort) and in any deployment.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
