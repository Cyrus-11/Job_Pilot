import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { delimiter, resolve } from "node:path";

const require = createRequire(import.meta.url);
const bin = process.env.PATH.split(delimiter).find(
  (entry) => entry.includes("_npx") && entry.endsWith(".bin"),
);
const { chromium } = require(
  bin ? resolve(bin, "../playwright") : "playwright",
);
const port = 3106;
const base = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    "--require",
    "./tests/fixtures/profile-backend.cjs",
    "node_modules/next/dist/bin/next",
    "start",
    "-p",
    String(port),
  ],
  {
    env: { ...process.env, JOBPILOT_PROFILE_TEST: "1" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverLog = "";
server.stdout.on("data", (data) => {
  serverLog += data;
});
server.stderr.on("data", (data) => {
  serverLog += data;
});
let browser;
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error(serverLog);
    try {
      if ((await fetch(`${base}/login`)).ok) break;
    } catch {}
    await new Promise((done) => setTimeout(done, 500));
  }
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === base && url.pathname === "/api/resume/extract")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            full_name: "Resume Person",
            email: "profile@example.test",
            phone: "+1 555 0100",
            location: "Austin, TX",
            linkedin_url: "",
            portfolio_url: "https://example.test",
            work_authorization: "citizen",
            current_title: "Resume Engineer",
            experience_level: "mid",
            years_experience: 3,
            skills: ["TypeScript", "React"],
            industries: ["SaaS"],
            work_experience: [
              {
                company: "Resume Co",
                title: "Frontend Engineer",
                start_date: "2021-01",
                end_date: "",
                is_current: true,
                responsibilities: "Built product interfaces",
              },
            ],
            education: {
              degree: "Bachelor",
              field: "Computer Science",
              institution: "Example University",
              graduation_year: "2020",
            },
            job_titles_seeking: ["Frontend Engineer"],
            remote_preference: "remote",
            salary_expectation: "$120k+",
            preferred_locations: ["Remote"],
            cover_letter_tone: "",
          },
        }),
      });
    else if (url.origin === base) await route.continue();
    else
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
  });
  const token = `profile-test.${Buffer.from(JSON.stringify({ sub: "00000000-0000-4000-8000-000000000006", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
  await context.addCookies([
    { name: "insforge_access_token", value: token, url: base },
  ]);
  const page = await context.newPage();
  const errors = [];
  const consoleErrors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(`${base}/profile`);
  await page.getByRole("heading", { name: "Profile Information" }).waitFor();
  assert.equal(
    await page.getByLabel("Email", { exact: true }).inputValue(),
    "profile@example.test",
  );
  assert.equal(
    await page.getByLabel("Email", { exact: true }).isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Save Profile", exact: true }).click();
  await page.getByText("Profile saved.", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("progressbar").getAttribute("aria-valuenow"),
    "20",
  );
  await page.getByLabel("Location", { exact: true }).fill("Lagos, Nigeria");
  await page.getByLabel("Current/Recent Job Title").fill("Frontend Engineer");
  await page.getByLabel("Experience Level").selectOption("junior");
  await page.getByLabel("Years of Experience").fill("0");
  await page.getByLabel("Skills", { exact: true }).fill("React");
  await page.getByLabel("Skills", { exact: true }).press("Enter");
  await page
    .getByLabel("Job Titles Seeking")
    .fill("Frontend Engineer, React Developer");
  await page.getByLabel("Remote Preference").selectOption("remote");
  await page.getByLabel("Work Authorization").selectOption("citizen");
  await page.getByRole("button", { name: "Add role", exact: true }).click();
  await page.getByLabel("Company Name").fill("Example Co");
  await page.getByLabel("Job Title", { exact: true }).fill("Engineer");
  await page.getByLabel("Start Date").fill("2024-01");
  await page.getByLabel("Currently working here").check();
  assert.equal(await page.getByLabel("End Date").isDisabled(), true);
  await page.getByRole("button", { name: "Add role", exact: true }).click();
  await page.getByRole("button", { name: "Add role", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Add role", exact: true })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Remove role 3" }).click();
  await page.getByRole("button", { name: "Remove role 2" }).click();
  await page.getByRole("button", { name: "Save Profile", exact: true }).click();
  await page.getByText("Profile saved.", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("progressbar").getAttribute("aria-valuenow"),
    "100",
  );
  await page.reload();
  assert.equal(
    await page.getByLabel("Location", { exact: true }).inputValue(),
    "Lagos, Nigeria",
  );
  assert.equal(
    await page.getByLabel("Company Name").inputValue(),
    "Example Co",
  );
  await page.getByLabel("Full Name").fill("FAIL SAVE");
  await page.getByRole("button", { name: "Save Profile", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "couldn't save" }).waitFor();
  assert.equal(await page.getByLabel("Full Name").inputValue(), "FAIL SAVE");
  await page.getByLabel("Full Name").fill("Unsaved edit");
  await page.getByLabel("Resume PDF").setInputFiles({
    name: "bad.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("not a PDF"),
  });
  await page.getByText("This file is not a valid PDF.").waitFor();
  const pdf = Buffer.alloc(2 * 1024 * 1024, 32);
  pdf.write("%PDF-1.7\n");
  await page.getByLabel("Resume PDF").setInputFiles({
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.getByText("Resume uploaded.", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Full Name").inputValue(), "Unsaved edit");
  await page
    .getByRole("button", { name: "Extract from Resume", exact: true })
    .click();
  await page.getByText("Review and save when ready").waitFor();
  assert.equal(await page.getByLabel("Full Name").inputValue(), "Resume Person");
  assert.equal(await page.getByLabel("Location", { exact: true }).inputValue(), "Austin, TX");
  assert.equal(
    await page.getByLabel("Current/Recent Job Title").inputValue(),
    "Resume Engineer",
  );
  const download = await context.request.get(`${base}/api/resume/download`);
  assert.equal(download.status(), 200);
  assert.equal((await download.body()).length, pdf.length);
  await page.reload();
  assert.equal(await page.getByLabel("Full Name").inputValue(), "Profile Test");
  await page.getByRole("link", { name: "Download resume" }).waitFor();
  const viewLink = page.getByRole("link", { name: "View resume", exact: true });
  await viewLink.waitFor();
  assert.equal(await viewLink.getAttribute("target"), "_blank");
  const preview = await context.request.get(
    `${base}${await viewLink.getAttribute("href")}`,
  );
  assert.equal(preview.status(), 200);
  assert.equal(
    preview.headers()["content-disposition"],
    'inline; filename="resume.pdf"',
  );
  assert.equal((await preview.body()).length, pdf.length);
  await mkdir("test-results/profile", { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({
      path: `test-results/profile/${width}.png`,
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `Overflow at ${width}px`,
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  console.log(
    "Profile browser checks passed: drafts, completion, reload, roles, failed save retention, invalid PDF, 2 MB upload, private download, and four responsive widths.",
  );
} catch (error) {
  console.error(serverLog.slice(-5000));
  throw error;
} finally {
  await browser?.close();
  server.kill();
  await new Promise((done) => {
    if (server.exitCode !== null) done();
    else server.once("exit", done);
  });
}
