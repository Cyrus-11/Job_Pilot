/* Only loaded by the isolated browser test process, never by the application. */
if (process.env.JOBPILOT_PROFILE_TEST !== "1")
  throw new Error("Test backend requires explicit opt-in");
const originalFetch = globalThis.fetch;
let profile = null;
let resume = null;
const owner = "00000000-0000-4000-8000-000000000006";
const completeProfile = {
  id: owner,
  full_name: "Profile Test",
  email: "profile@example.test",
  phone: "",
  location: "Lagos, Nigeria",
  linkedin_url: "",
  portfolio_url: "",
  work_authorization: "citizen",
  current_title: "Frontend Engineer",
  experience_level: "mid",
  years_experience: 5,
  skills: ["React", "TypeScript"],
  industries: [],
  work_experience: [
    {
      company: "Example Co",
      title: "Frontend Engineer",
      start_date: "2020-01",
      end_date: "",
      is_current: true,
      responsibilities: "Built product interfaces",
    },
  ],
  education: {
    degree: "",
    field: "",
    institution: "",
    graduation_year: "",
  },
  job_titles_seeking: ["Frontend Engineer"],
  remote_preference: "any",
  salary_expectation: "",
  preferred_locations: [],
  cover_letter_tone: "",
  is_complete: true,
  completion_percentage: 100,
  missing_fields: [],
  resume_pdf_key: `${owner}/resume.pdf`,
};
if (process.env.JOBPILOT_EXTRACTION_TEST === "1" || process.env.JOBPILOT_GENERATION_TEST === "1") {
  profile = { ...completeProfile };
  resume = import("./resume-pdf.cjs").then(({ default: pdf }) => pdf());
}
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
  const headers = new Headers(
    init.headers ?? (input instanceof Request ? input.headers : undefined),
  );
  const method = init.method ?? "GET";
  const json = (value, status = 200) => Response.json(value, { status });
  if (url.protocol === "data:")
    return originalFetch(input, init);
  if (url.hostname === "api.openai.com" && (process.env.JOBPILOT_EXTRACTION_TEST === "1" || process.env.JOBPILOT_GENERATION_TEST === "1")) {
    const body = JSON.parse(init.body ?? await input.text());
    if (body.messages[1].content.includes("Test Candidate has five years"))
      return json({ choices: [{ message: { content: JSON.stringify({ full_name: "Test Candidate", skills: ["React", "TypeScript"] }) } }] });
    if (!body.messages[1].content.includes("Profile Test"))
      throw new Error("Actual PDF text did not reach OpenAI");
    return json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              headline: "Frontend Engineer",
              professional_summary: "Frontend engineer building reliable product experiences.",
              skills: ["React", "TypeScript"],
              work_experience: [
                {
                  company: "Example Co",
                  title: "Frontend Engineer",
                  start_date: "2020-01",
                  end_date: "",
                  is_current: true,
                  bullets: ["Built accessible product interfaces."],
                },
              ],
            }),
          },
        },
      ],
    });
  }
  if (url.pathname === "/api/auth/sessions/current") {
    return headers.get("authorization")?.includes("profile-test")
      ? json({
          user: {
            id: owner,
            email: "profile@example.test",
            profile: { name: "Profile Test" },
          },
        })
      : json({ message: "Unauthorized", statusCode: 401 }, 401);
  }
  if (url.pathname === "/api/auth/refresh")
    return json({ message: "Unauthorized", statusCode: 401 }, 401);
  if (url.pathname === "/api/database/records/profiles") {
    if (method === "POST") {
      const input = JSON.parse(init.body);
      profile = Array.isArray(input) ? input[0] : input;
      return json([profile], 201);
    }
    const matches =
      profile &&
      [...url.searchParams].every(([key, value]) => {
        if (value.startsWith("eq."))
          return String(profile[key]) === value.slice(3);
        if (value === "is.null") return profile[key] == null;
        return true;
      });
    if (method === "PATCH" && matches) {
      const patch = JSON.parse(init.body);
      if (patch.full_name === "FAIL SAVE")
        return json({ message: "Simulated failure", code: "TEST_ERROR" }, 500);
      profile = { ...profile, ...patch };
    }
    return json(
      headers.get("accept")?.includes("vnd.pgrst.object")
        ? matches
          ? profile
          : null
        : matches
          ? [profile]
          : [],
    );
  }
  if (url.pathname.endsWith("/upload-strategy"))
    return json({ method: "direct" });
  if (url.pathname.includes("/download-strategy/objects/"))
    return json({
      method: "direct",
      url: "http://profile-fixture.local/resume",
    });
  if (
    url.pathname.startsWith("/api/storage/buckets/resumes/objects/") &&
    method === "PUT"
  ) {
    resume = init.body.get("file");
    return json({
      key: `${owner}/resume.pdf`,
      url: "http://profile-fixture.local/resume",
      bucket: "resumes",
      mimeType: "application/pdf",
      size: resume.size,
    });
  }
  if (url.hostname === "profile-fixture.local")
    return new Response(await resume, {
      headers: { "content-type": "application/pdf" },
    });
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    return originalFetch(input, init);
  // Prevent test identities and events reaching production analytics or external backends.
  return json({});
};
