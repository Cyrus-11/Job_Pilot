import type { ReactElement } from "react";
import { redirect } from "next/navigation";

import { ProfilePageContent } from "@/components/profile/ProfilePageContent";
import { createInsforgeServer } from "@/lib/insforge-server";
import {
  PROFILE_COLUMNS,
  profileFromRow,
  type ProfileData,
} from "@/lib/profile";

export default async function ProfilePage(): Promise<ReactElement> {
  const client = await createInsforgeServer();
  const { data: auth, error: authError } = await client.auth.getCurrentUser();
  if (authError || !auth?.user) redirect("/login?next=%2Fprofile");
  const user = auth.user;
  let initialProfile: ProfileData | null = null;
  let hasResume = false;
  try {
    const { data, error } = await client.database
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    initialProfile = profileFromRow(
      data,
      user.email ?? "",
      user.profile?.name ?? "",
    );
    hasResume = Boolean(data?.resume_pdf_key);
  } catch (error) {
    console.error(
      "[profile/page] Load failed",
      error instanceof Error ? error.name : "Database error",
    );
  }
  if (!initialProfile) {
    return (
      <section className="mx-auto max-w-[936px] rounded-xl border border-border bg-surface p-8">
        <h1 className="text-2xl font-bold text-text-primary">
          Profile unavailable
        </h1>
        <p role="alert" className="mt-3 text-text-secondary">
          We could not load your profile. Please try again.
        </p>
        <a
          href="/profile"
          className="mt-5 inline-flex rounded-md bg-accent px-5 py-3 font-semibold text-accent-foreground"
        >
          Try again
        </a>
      </section>
    );
  }
  return (
    <ProfilePageContent
      key={user.id}
      initialProfile={initialProfile}
      hasResume={hasResume}
    />
  );
}
