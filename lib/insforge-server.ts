import { cookies } from "next/headers";
import { createServerClient } from "@insforge/sdk/ssr";

export async function createInsforgeServer(): Promise<ReturnType<typeof createServerClient>> {
  return createServerClient({
    cookies: await cookies(),
  });
}
