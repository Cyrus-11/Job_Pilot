"use server";

import { revalidatePath } from "next/cache";

import { createInsforgeServer } from "@/lib/insforge-server";
import {
  calculateCompletion,
  profileSchema,
  profileToRow,
  validateResume,
  type ProfileActionResult,
} from "@/lib/profile";
import { ensureProfile } from "@/lib/profile-server";
import { capturePostHogServerEvent } from "@/lib/posthog-server";

export async function saveProfile(
  input: unknown,
): Promise<ProfileActionResult> {
  try {
    const client = await createInsforgeServer();
    const { data: auth, error: authError } = await client.auth.getCurrentUser();
    if (authError || !auth?.user)
      return {
        success: false,
        error: "Your session expired. Sign in again to save your profile.",
      };
    const user = auth.user;
    const candidate = typeof input === "object" && input !== null ? input : {};
    const parsed = profileSchema.safeParse({
      ...candidate,
      email: user.email ?? "",
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const root = String(issue.path[0] ?? "");
        const field = [
          "skills",
          "industries",
          "job_titles_seeking",
          "preferred_locations",
        ].includes(root)
          ? root
          : issue.path.join(".");
        fieldErrors[field] ??= issue.message;
      }
      return {
        success: false,
        error: "Please check the highlighted fields.",
        fieldErrors,
      };
    }
    await ensureProfile(client, user.id, user.email ?? "");
    const { data, error } = await client.database
      .from("profiles")
      .update(profileToRow(parsed.data))
      .eq("id", user.id)
      .select("id")
      .single();
    if (error || !data)
      throw error ?? new Error("Profile update returned no row");
    const completion = calculateCompletion(parsed.data);
    if (completion.is_complete) {
      // Claim the first completion atomically so retries and concurrent tabs do not duplicate analytics.
      const { data: claimed, error: claimError } = await client.database
        .from("profiles")
        .update({ first_completed_at: new Date().toISOString() })
        .eq("id", user.id)
        .eq("is_complete", true)
        .is("first_completed_at", null)
        .select("id")
        .maybeSingle();
      if (claimError)
        console.error(
          "[actions/profile] Completion event claim failed",
          claimError.code,
        );
      if (claimed)
        await capturePostHogServerEvent({
          event: "profile_completed",
          properties: { userId: user.id },
        });
    }
    revalidatePath("/profile");
    return { success: true, completion };
  } catch (error) {
    console.error(
      "[actions/profile] Save failed",
      error instanceof Error ? error.name : "Database error",
    );
    return {
      success: false,
      error:
        "We couldn't save your profile. Your edits are still here. Please try again.",
    };
  }
}

export async function uploadResume(
  formData: FormData,
): Promise<ProfileActionResult> {
  try {
    const client = await createInsforgeServer();
    const { data: auth, error: authError } = await client.auth.getCurrentUser();
    if (authError || !auth?.user)
      return {
        success: false,
        error: "Your session expired. Sign in again to upload your resume.",
      };
    const file = formData.get("resume");
    const validationError = await validateResume(file);
    if (validationError || !(file instanceof File))
      return { success: false, error: validationError ?? "Select a PDF." };
    const user = auth.user;
    await ensureProfile(
      client,
      user.id,
      user.email ?? "",
      user.profile?.name ?? "",
    );
    const { data, error } = await client.storage
      .from("resumes")
      .upload(
        `${user.id}/resume.pdf`,
        new Blob([await file.arrayBuffer()], { type: "application/pdf" }),
      );
    if (error || !data) throw error ?? new Error("Upload returned no file");
    const { error: saveError } = await client.database
      .from("profiles")
      .update({ resume_pdf_url: data.url, resume_pdf_key: data.key })
      .eq("id", user.id)
      .select("id")
      .single();
    if (saveError) {
      return {
        success: false,
        error:
          "The PDF uploaded, but its profile link could not be saved. Upload it again to finish.",
      };
    }
    revalidatePath("/profile");
    return { success: true, resumeUploaded: true };
  } catch (error) {
    console.error(
      "[actions/profile] Upload failed",
      error instanceof Error ? error.name : "Storage error",
    );
    return {
      success: false,
      error: "We couldn't upload your resume. Please try again.",
    };
  }
}
