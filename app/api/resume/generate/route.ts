import { revalidatePath } from "next/cache";

import { createInsforgeServer } from "@/lib/insforge-server";
import {
  calculateCompletion,
  profileFromRow,
  type ResumeGenerationResult,
} from "@/lib/profile";
import {
  generateResumeContent,
  renderResumePdfBuffer,
} from "@/lib/resume-generation";
import { ensureProfile } from "@/lib/profile-server";
import { extractionDiagnostic } from "@/lib/extraction-diagnostic";

export const runtime = "nodejs";

function json(
  body: ResumeGenerationResult,
  status: number = 200,
): Response {
  return Response.json(body, { status });
}

export async function POST(): Promise<Response> {
  let stage = "authentication";
  try {
    const client = await createInsforgeServer();
    const { data: auth, error: authError } = await client.auth.getCurrentUser();
    if (authError || !auth?.user)
      return json(
        {
          success: false,
          error: "Your session expired. Sign in again to generate a resume.",
        },
        401,
      );
    const user = auth.user;
    stage = "profile lookup";
    await ensureProfile(client, user.id, user.email ?? "", user.profile?.name ?? "");
    const { data: row, error } = await client.database
      .from("profiles")
      .select(
        "full_name,email,phone,location,linkedin_url,portfolio_url,work_authorization,current_title,experience_level,years_experience,skills,industries,work_experience,education,job_titles_seeking,remote_preference,salary_expectation,preferred_locations,cover_letter_tone",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    const profile = profileFromRow(row, user.email ?? "", user.profile?.name ?? "");
    const completion = calculateCompletion(profile);
    if (!completion.is_complete)
      return json(
        {
          success: false,
          error: "Complete and save your profile before generating a resume.",
        },
        422,
      );
    stage = "resume content generation";
    const resume = await generateResumeContent(profile);
    stage = "PDF rendering";
    const buffer = await renderResumePdfBuffer(profile, resume);
    const fileBytes = new Uint8Array(buffer.length);
    fileBytes.set(buffer);
    stage = "resume upload";
    const { data: upload, error: uploadError } = await client.storage
      .from("resumes")
      .upload(
        `${user.id}/resume.pdf`,
        new Blob([fileBytes], { type: "application/pdf" }),
      );
    if (uploadError || !upload)
      throw uploadError ?? new Error("Resume upload returned no file");
    stage = "profile update";
    const { error: saveError } = await client.database
      .from("profiles")
      .update({ resume_pdf_url: upload.url, resume_pdf_key: upload.key })
      .eq("id", user.id)
      .select("id")
      .single();
    if (saveError) throw saveError;
    revalidatePath("/profile");
    return json({ success: true, data: { resumeUrl: upload.url } });
  } catch (error) {
    console.error(
      "[resume/generate] Generation failed",
      extractionDiagnostic(error, stage, "Generation"),
    );
    return json(
      {
        success: false,
        error: "We couldn't generate your resume. Please try again.",
      },
      500,
    );
  }
}
