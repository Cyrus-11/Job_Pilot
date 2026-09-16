import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");
function load(path, mocks = {}) {
  const exports = {};
  new Function(
    "require",
    "exports",
    ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
  )(
    (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    exports,
  );
  return exports;
}
const profile = load("lib/profile.ts");
const extraction = load("lib/resume-extraction.ts", { "@/lib/profile": profile });
const { extractionDiagnostic } = load("lib/extraction-diagnostic.ts");

test("real PDF parser extracts text and rejects blank or malformed documents", async () => {
  const pdf = require("./fixtures/resume-pdf.cjs");
  const text = await extraction.extractPdfText(new Blob([pdf()]));
  assert.match(text, /Test Candidate has five years/);
  extraction.assertResumeTextUsable(text);
  const blank = await extraction.extractPdfText(new Blob([pdf("")]));
  assert.throws(() => extraction.assertResumeTextUsable(blank), /RESUME_TEXT_TOO_SHORT/);
  await assert.rejects(() => extraction.extractPdfText(new Blob(["%PDF-1.7\n%%EOF"])));
});

test("real extraction helper validates model JSON and preserves account email", async () => {
  const client = (content) => ({ chat: { completions: { create: async () => ({ choices: [{ message: { content } }] }) } } });
  for (const value of [{ full_name: "Candidate" }, { profile: { full_name: "Candidate" } }]) {
    const result = await extraction.extractProfileFromResumeText("resume", "owner@example.test", client(JSON.stringify(value)));
    assert.equal(result.full_name, "Candidate");
    assert.equal(result.email, "owner@example.test");
  }
  for (const content of ["", "{", '{"years_experience": -1}']) {
    await assert.rejects(() => extraction.extractProfileFromResumeText("resume", "owner@example.test", client(content)));
  }
});

test("extraction diagnostics retain worker errors and provider metadata without model content or secrets", () => {
  const worker = extractionDiagnostic(new Error("Setting up fake worker failed: Cannot find module pdf.worker.mjs"), "PDF parsing");
  assert.match(worker.message, /pdf.worker.mjs/);
  assert.equal(worker.stage, "PDF parsing");
  const provider = extractionDiagnostic(Object.assign(new Error("Invalid key sk-secret and private resume text"), { status: 401, code: "invalid_api_key", request_id: "req_test" }), "profile extraction");
  assert.equal(provider.status, 401);
  assert.equal(provider.code, "invalid_api_key");
  assert.equal(provider.requestId, "req_test");
  assert.doesNotMatch(JSON.stringify(provider), /sk-secret|private resume/);
  const syntax = extractionDiagnostic(new SyntaxError("private resume text"), "profile extraction");
  assert.equal(syntax.message, "Model response was not valid JSON");
});
const complete = {
  ...profile.emptyProfile("owner@example.test", "Test Owner"),
  location: "Lagos, Nigeria",
  current_title: "Frontend Developer",
  experience_level: "junior",
  years_experience: 0,
  skills: ["React"],
  job_titles_seeking: ["Frontend Developer"],
  remote_preference: "any",
  work_authorization: "citizen",
};

function harness({
  user = { id: "owner", email: "owner@example.test" },
  row = null,
  failUpdate = false,
  failUpload = false,
  failGeneration = false,
  extractedText = "Resume text with enough content to describe a candidate profile, work history, skills, education, and preferred roles for extraction.",
  extractedProfile = { ...complete, full_name: "Extracted Candidate" },
} = {}) {
  let saved = row;
  const events = [],
    writes = [],
    uploads = [],
    extractions = [],
    generations = [],
    paths = [];
  const client = {
    auth: { getCurrentUser: async () => ({ data: { user }, error: null }) },
    database: {
      from(table) {
        assert.equal(table, "profiles");
        let operation = "read",
          values;
        const filters = [];
        const query = {
          select() {
            return query;
          },
          eq(key, value) {
            filters.push([key, value]);
            return query;
          },
          is(key, value) {
            filters.push([key, value]);
            return query;
          },
          update(value) {
            operation = "update";
            values = value;
            return query;
          },
          insert(value) {
            operation = "insert";
            values = value[0];
            return query;
          },
          single() {
            return execute();
          },
          maybeSingle() {
            return execute();
          },
          then(resolve, reject) {
            return execute().then(resolve, reject);
          },
        };
        async function execute() {
          if (operation !== "insert")
            assert.ok(
              filters.some(([key, value]) => key === "id" && value === "owner"),
              "Every read/update needs the authenticated owner's filter",
            );
          if (operation === "insert") {
            saved = { ...values };
            writes.push(values);
            return { data: saved, error: null };
          }
          if (operation === "update") {
            if (failUpdate)
              return { data: null, error: { code: "TEST_ERROR" } };
            if (
              !saved ||
              filters.some(([key, value]) => (saved[key] ?? null) !== value)
            )
              return { data: null, error: null };
            writes.push(values);
            saved = { ...saved, ...values };
            return { data: saved, error: null };
          }
          return { data: saved, error: null };
        }
        return query;
      },
    },
    storage: {
      from(bucket) {
        assert.equal(bucket, "resumes");
        return {
          async upload(key, file) {
            uploads.push({ key, file });
            return failUpload
              ? { data: null, error: new Error("Upload failed") }
              : {
                  data: { url: "https://backend.example.test/private", key },
                  error: null,
                };
          },
          async download(key) {
            assert.equal(key, "owner/resume.pdf");
            return { data: new Blob(["%PDF-1.7\n%%EOF"]), error: null };
          },
        };
      },
    },
  };
  const server = { createInsforgeServer: async () => client };
  const helpers = load("lib/profile-server.ts", {
    "@/lib/insforge-server": server,
    "@/lib/profile": profile,
  });
  const actions = load("actions/profile.ts", {
    "@/lib/insforge-server": server,
    "@/lib/profile": profile,
    "@/lib/profile-server": helpers,
    "next/cache": { revalidatePath: (path) => paths.push(path) },
    "@/lib/posthog-server": {
      capturePostHogServerEvent: async (event) => events.push(event),
    },
  });
  const download = load("app/api/resume/download/route.ts", {
    "@/lib/insforge-server": server,
  });
  const extract = load("app/api/resume/extract/route.ts", {
    "@/lib/extraction-diagnostic": load("lib/extraction-diagnostic.ts"),
    "@/lib/insforge-server": server,
    "@/lib/resume-extraction": {
      extractPdfText: async (file) => {
        extractions.push({ step: "pdf", size: file.size });
        return extractedText;
      },
      assertResumeTextUsable: (text) => {
        extractions.push({ step: "usable", text });
        if (text === "short") throw new Error("RESUME_TEXT_TOO_SHORT");
      },
      extractProfileFromResumeText: async (text, email) => {
        extractions.push({ step: "openai", text, email });
        return { ...extractedProfile, email };
      },
    },
  });
  const generate = load("app/api/resume/generate/route.ts", {
    "@/lib/extraction-diagnostic": load("lib/extraction-diagnostic.ts"),
    "@/lib/insforge-server": server,
    "@/lib/profile": profile,
    "@/lib/profile-server": helpers,
    "@/lib/resume-generation": {
      generateResumeContent: async (savedProfile) => {
        generations.push({ step: "openai", profile: savedProfile });
        if (failGeneration) throw new Error("MODEL_UNAVAILABLE");
        return {
          headline: "Frontend Engineer",
          professional_summary: "Builds reliable user interfaces.",
          skills: ["React", "TypeScript"],
          work_experience: [
            {
              company: "Test",
              title: "Engineer",
              start_date: "2020-01",
              end_date: "",
              is_current: true,
              bullets: ["Built accessible product surfaces."],
            },
          ],
        };
      },
      renderResumePdfBuffer: async () => {
        generations.push({ step: "pdf" });
        return Buffer.from("%PDF-1.7\nGenerated\n%%EOF");
      },
    },
    "next/cache": { revalidatePath: (path) => paths.push(path) },
  });
  return {
    ...actions,
    download: (query = "") =>
      download.GET(new Request(`http://localhost/api/resume/download${query}`)),
    extract: () => extract.POST(),
    generate: () => generate.POST(),
    events,
    writes,
    uploads,
    extractions,
    generations,
    paths,
    get saved() {
      return saved;
    },
  };
}

test("completion supports first-time job seekers and does not require optional history/resume", () => {
  assert.deepEqual(profile.calculateCompletion(complete), {
    is_complete: true,
    completion_percentage: 100,
    missing_fields: [],
  });
  const incomplete = profile.calculateCompletion({
    ...complete,
    skills: [],
    years_experience: null,
  });
  assert.equal(incomplete.completion_percentage, 80);
  assert.deepEqual(incomplete.missing_fields, [
    "Years of experience",
    "Skills",
  ]);
});

test("validation rejects malformed values and normalizes tags and current roles", () => {
  for (const change of [
    { years_experience: -1 },
    { years_experience: 1.5 },
    { experience_level: "expert" },
    { linkedin_url: "javascript:alert(1)" },
    { skills: Array(31).fill("React") },
    { work_experience: Array(4).fill({}) },
    { work_experience: [{ start_date: "2024-05", end_date: "2023-01" }] },
  ]) {
    assert.equal(
      profile.profileSchema.safeParse({ ...complete, ...change }).success,
      false,
    );
  }
  const data = profile.profileSchema.parse({
    ...complete,
    skills: ["React", " react "],
    work_experience: [{ is_current: true, end_date: "2020-01" }],
  });
  assert.deepEqual(data.skills, ["React"]);
  assert.equal(data.work_experience[0].end_date, "");
});

test("save creates drafts and uses the authenticated identity, ignoring injected ownership and metadata", async () => {
  const app = harness();
  const result = await app.saveProfile({
    ...profile.emptyProfile("forged@example.test"),
    id: "victim",
    is_complete: true,
    resume_pdf_key: "victim/resume.pdf",
  });
  assert.equal(result.success, true);
  assert.equal(app.saved.id, "owner");
  assert.equal(app.saved.email, "owner@example.test");
  assert.equal(app.saved.is_complete, false);
  assert.equal(app.saved.resume_pdf_key, undefined);
  assert.deepEqual(app.paths, ["/profile"]);
  assert.equal(app.events.length, 0);
});

test("first completion is claimed once across repeated saves and incomplete/complete transitions", async () => {
  const app = harness();
  assert.equal((await app.saveProfile(complete)).success, true);
  await app.saveProfile(complete);
  await app.saveProfile({ ...complete, location: "" });
  await app.saveProfile(complete);
  assert.equal(app.events.length, 1);
  assert.equal(app.events[0].event, "profile_completed");
  assert.equal(app.saved.completion_percentage, 100);
});

test("invalid data and anonymous actions cannot write profile or storage", async () => {
  const app = harness();
  const invalid = await app.saveProfile({ ...complete, years_experience: -3 });
  assert.equal(invalid.success, false);
  assert.ok(invalid.fieldErrors.years_experience);
  assert.equal(app.writes.length, 0);
  const anon = harness({ user: null });
  assert.equal((await anon.saveProfile(complete)).success, false);
  assert.equal((await anon.uploadResume(new FormData())).success, false);
  assert.equal((await anon.download()).status, 401);
  assert.equal(anon.writes.length + anon.uploads.length, 0);
});

test("PDF validation rejects empty, spoofed and oversized files", async () => {
  for (const file of [
    new File([], "empty.pdf"),
    new File(["plain text"], "fake.pdf", { type: "application/pdf" }),
    new File(["%PDF-1.7"], "wrong.txt"),
    new File([new Uint8Array(profile.MAX_RESUME_BYTES + 1)], "big.pdf"),
  ]) {
    assert.ok(await profile.validateResume(file));
  }
  assert.equal(
    await profile.validateResume(
      new File(["%PDF-1.7\n%%EOF"], "resume.pdf", { type: "application/pdf" }),
    ),
    null,
  );
});

test("list item errors are attached to the visible list field", async () => {
  const app = harness();
  const result = await app.saveProfile({
    ...complete,
    job_titles_seeking: ["x".repeat(101)],
  });
  assert.equal(result.success, false);
  assert.ok(result.fieldErrors.job_titles_seeking);
  assert.equal(app.writes.length, 0);
});

test("resume upload only updates file metadata and download is private and owner-scoped", async () => {
  const app = harness({ row: { id: "owner", ...complete } });
  const data = new FormData();
  data.set(
    "resume",
    new File(["%PDF-1.7\n%%EOF"], "resume.pdf", { type: "application/pdf" }),
  );
  assert.equal((await app.uploadResume(data)).success, true);
  assert.equal(app.uploads[0].key, "owner/resume.pdf");
  assert.deepEqual(Object.keys(app.writes[0]).sort(), [
    "resume_pdf_key",
    "resume_pdf_url",
  ]);
  assert.equal(app.saved.full_name, complete.full_name);
  const response = await app.download();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(await response.text(), "%PDF-1.7\n%%EOF");
  const foreign = harness({
    row: { id: "owner", resume_pdf_key: "victim/resume.pdf" },
  });
  assert.equal((await foreign.download()).status, 404);
});

test("resume preview is inline and retains authentication, owner checks, and no-store caching", async () => {
  const app = harness({
    row: { id: "owner", resume_pdf_key: "owner/resume.pdf" },
  });
  const preview = await app.download("?view=1");
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get("content-type"), "application/pdf");
  assert.equal(
    preview.headers.get("content-disposition"),
    'inline; filename="resume.pdf"',
  );
  assert.equal(preview.headers.get("cache-control"), "private, no-store");
  assert.equal(await preview.text(), "%PDF-1.7\n%%EOF");
  for (const query of ["", "?view=invalid"]) {
    assert.equal(
      (await app.download(query)).headers.get("content-disposition"),
      'attachment; filename="resume.pdf"',
    );
  }
  assert.equal((await harness({ user: null }).download("?view=1")).status, 401);
  assert.equal((await harness().download("?view=1")).status, 404);
  assert.equal(
    (
      await harness({
        row: { id: "owner", resume_pdf_key: "victim/resume.pdf" },
      }).download("?view=1")
    ).status,
    404,
  );
});

test("resume extraction reads the private owner PDF and returns an unsaved profile draft", async () => {
  const app = harness({
    row: { id: "owner", resume_pdf_key: "owner/resume.pdf" },
  });
  const response = await app.extract();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.full_name, "Extracted Candidate");
  assert.equal(body.data.email, "owner@example.test");
  assert.deepEqual(
    app.extractions.map((entry) => entry.step),
    ["pdf", "usable", "openai"],
  );
  assert.equal(app.writes.length, 0);
});

test("resume extraction rejects anonymous, missing, foreign, and textless resumes without writing", async () => {
  assert.equal((await harness({ user: null }).extract()).status, 401);
  assert.equal((await harness().extract()).status, 404);
  assert.equal(
    (
      await harness({
        row: { id: "owner", resume_pdf_key: "victim/resume.pdf" },
      }).extract()
    ).status,
    404,
  );
  const textless = harness({
    row: { id: "owner", resume_pdf_key: "owner/resume.pdf" },
    extractedText: "short",
  });
  const response = await textless.extract();
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /Could not extract text/);
  assert.equal(textless.writes.length, 0);
});

test("resume generation uses the saved owner profile and only updates resume metadata", async () => {
  const app = harness({ row: { id: "owner", ...profile.profileToRow(complete) } });
  const response = await app.generate();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.resumeUrl, "https://backend.example.test/private");
  assert.deepEqual(
    app.generations.map((entry) => entry.step),
    ["openai", "pdf"],
  );
  assert.equal(app.generations[0].profile.email, "owner@example.test");
  assert.equal(app.uploads[0].key, "owner/resume.pdf");
  assert.equal(app.uploads[0].file.type, "application/pdf");
  assert.deepEqual(Object.keys(app.writes.at(-1)).sort(), [
    "resume_pdf_key",
    "resume_pdf_url",
  ]);
  assert.equal(app.saved.full_name, complete.full_name);
  assert.ok(app.paths.includes("/profile"));
});

test("resume generation rejects anonymous and incomplete profiles without generating or uploading", async () => {
  assert.equal((await harness({ user: null }).generate()).status, 401);
  const incomplete = harness({
    row: { id: "owner", ...profile.profileToRow({ ...complete, skills: [] }) },
  });
  const response = await incomplete.generate();
  assert.equal(response.status, 422);
  assert.match((await response.json()).error, /Complete and save/);
  assert.equal(incomplete.generations.length, 0);
  assert.equal(incomplete.uploads.length, 0);
});

test("resume generation failures do not replace stored resume metadata", async () => {
  const app = harness({
    row: {
      id: "owner",
      ...profile.profileToRow(complete),
      resume_pdf_url: "old-url",
      resume_pdf_key: "owner/resume.pdf",
    },
    failGeneration: true,
  });
  const response = await app.generate();
  assert.equal(response.status, 500);
  assert.equal(app.uploads.length, 0);
  assert.equal(app.saved.resume_pdf_url, "old-url");
  assert.equal(app.paths.length, 0);
});

test("failed save does not report success or revalidate; partial uploads report the retry needed", async () => {
  const app = harness({ row: { id: "owner", ...complete }, failUpdate: true });
  assert.equal((await app.saveProfile(complete)).success, false);
  assert.equal(app.paths.length, 0);
  const data = new FormData();
  data.set("resume", new File(["%PDF-1.7\n%%EOF"], "resume.pdf"));
  const result = await app.uploadResume(data);
  assert.equal(result.success, false);
  assert.match(result.error, /uploaded.*link/i);
});

test("loading restores structured fields and always takes email from the current session", () => {
  const row = profile.profileToRow({
    ...complete,
    phone: "+234123456789",
    work_experience: [
      {
        company: "Test",
        title: "Engineer",
        start_date: "2020-01",
        end_date: "",
        is_current: true,
        responsibilities: "Built software",
      },
    ],
  });
  const restored = profile.profileFromRow(row, "new@example.test");
  assert.equal(restored.email, "new@example.test");
  assert.equal(restored.phone, "+234123456789");
  assert.equal(restored.cover_letter_tone, "");
  assert.deepEqual(restored.skills, ["React"]);
  assert.deepEqual(restored.work_experience, row.work_experience);
});
