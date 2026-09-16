import { createInsforgeServer } from "@/lib/insforge-server";

export async function GET(request: Request): Promise<Response> {
  try {
    const client = await createInsforgeServer();
    const { data: auth, error: authError } = await client.auth.getCurrentUser();
    if (authError || !auth?.user)
      return Response.json(
        { success: false, error: "Sign in to download your resume." },
        { status: 401 },
      );
    const { data: profile, error } = await client.database
      .from("profiles")
      .select("resume_pdf_key")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (profile?.resume_pdf_key !== `${auth.user.id}/resume.pdf`)
      return Response.json(
        { success: false, error: "No resume found." },
        { status: 404 },
      );
    const { data: file, error: downloadError } = await client.storage
      .from("resumes")
      .download(profile.resume_pdf_key);
    if (downloadError || !file)
      throw downloadError ?? new Error("Missing resume");
    const disposition =
      new URL(request.url).searchParams.get("view") === "1"
        ? "inline"
        : "attachment";
    return new Response(file, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="resume.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(
      "[resume/download] Download failed",
      error instanceof Error ? error.name : "Storage error",
    );
    return Response.json(
      {
        success: false,
        error: "Unable to download your resume. Please try again.",
      },
      { status: 500 },
    );
  }
}
