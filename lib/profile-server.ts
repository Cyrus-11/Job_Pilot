import { createInsforgeServer } from "@/lib/insforge-server";
import { emptyProfile, profileToRow } from "@/lib/profile";

type Client = Awaited<ReturnType<typeof createInsforgeServer>>;

export async function ensureProfile(
  client: Client,
  id: string,
  email: string,
  name: string = "",
): Promise<void> {
  const { data, error } = await client.database
    .from("profiles")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (data) return;
  const { error: insertError } = await client.database
    .from("profiles")
    .insert([{ id, ...profileToRow(emptyProfile(email, name)) }]);
  // Another tab may create the owner's row between the read and insert.
  if (insertError && insertError.code !== "23505") throw insertError;
}
