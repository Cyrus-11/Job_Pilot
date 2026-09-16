import { createInsforgeServer } from "@/lib/insforge-server";
import {
  assertResumeTextUsable,
  extractPdfText,
  extractProfileFromResumeText,
} from "@/lib/resume-extraction";
import type { ProfileExtractionResult } from "@/lib/profile";
import { extractionDiagnostic } from "@/lib/extraction-diagnostic";

export const runtime = "nodejs";

function json(
  body: ProfileExtractionResult,
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
          error: "Your session expired. Sign in again to extract your resume.",
        },
        401,
      );
    stage = "profile lookup";
    const { data: profile, error } = await client.database
      .from("profiles")
      .select("resume_pdf_key")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (profile?.resume_pdf_key !== `${auth.user.id}/resume.pdf`)
      return json(
        {
          success: false,
          error: "Upload a resume before extracting profile details.",
        },
        404,
      );
    stage = "resume download";
    const { data: file, error: downloadError } = await client.storage
      .from("resumes")
      .download(profile.resume_pdf_key);
    if (downloadError || !file)
      throw downloadError ?? new Error("Missing resume");
    stage = "PDF parsing";
    const text = await extractPdfText(file);
    assertResumeTextUsable(text);
    stage = "profile extraction";
    const data = await extractProfileFromResumeText(
      text,
      auth.user.email ?? "",
    );
    return json({ success: true, data });
  } catch (error) {
    if (error instanceof Error && error.message === "RESUME_TEXT_TOO_SHORT")
      return json(
        {
          success: false,
          error:
            "Could not extract text from this PDF. Please try a different file.",
        },
        422,
      );
    console.error(
      "[resume/extract] Extraction failed",
      extractionDiagnostic(error, stage),
    );
    return json(
      {
        success: false,
        error:
          "We couldn't extract profile details from your resume. Please try again.",
      },
      500,
    );
  }
}
