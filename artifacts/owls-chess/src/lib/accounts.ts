import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";

export function accountConfiguration(env: Record<string, unknown>) {
  if (env.VITE_CHESS_ACCOUNTS_ENABLED !== "true")
    return { enabled: false as const };
  const url = z.string().url().parse(env.VITE_SUPABASE_URL);
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(parsed.hostname)
  )
    throw new Error("Supabase requires HTTPS.");
  const key = z
    .string()
    .startsWith("sb_publishable_")
    .parse(env.VITE_SUPABASE_PUBLISHABLE_KEY);
  return { enabled: true as const, url, key };
}

export function createAccountClient(
  config: ReturnType<typeof accountConfiguration>,
): SupabaseClient | null {
  if (!config.enabled) return null;
  return createClient(config.url, config.key, {
    auth: {
      storageKey: "chess_supabase_auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Use at least two characters.")
  .max(40, "Use no more than 40 characters.");
const profileSchema = z.object({
  user_id: z.string().uuid(),
  display_name: displayNameSchema,
});
const membershipSchema = z.object({
  club_id: z.string().uuid(),
  role: z.enum(["student", "teacher", "admin"]),
  chess_clubs: z.object({ name: z.string() }),
});
export type AccountProfile = z.infer<typeof profileSchema>;
export type ClubMembership = z.infer<typeof membershipSchema>;

export async function loadAccount(client: SupabaseClient, user: User) {
  // Metadata supplies a nickname only. Roles always come from protected membership rows.
  const nickname = displayNameSchema.safeParse(
    user.user_metadata?.display_name,
  );
  const { error: insertError } = await client.from("chess_profiles").upsert(
    {
      user_id: user.id,
      display_name: nickname.success ? nickname.data : "Chess player",
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (insertError)
    throw new Error(
      "Your profile could not be loaded. Please try again or contact your teacher.",
    );
  const [
    { data: profile, error: profileError },
    { data: memberships, error: membershipError },
  ] = await Promise.all([
    client
      .from("chess_profiles")
      .select("user_id,display_name")
      .eq("user_id", user.id)
      .single(),
    client
      .from("chess_memberships")
      .select("club_id,role,chess_clubs(name)")
      .eq("user_id", user.id)
      .eq("active", true),
  ]);
  if (profileError || membershipError)
    throw new Error("Your club details could not be loaded. Please try again.");
  return {
    profile: profileSchema.parse(profile),
    memberships: z.array(membershipSchema).parse(memberships),
  };
}
