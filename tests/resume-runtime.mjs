import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

const listener = createServer();
listener.listen(0, "127.0.0.1");
await once(listener, "listening");
const port = listener.address().port;
await new Promise((done) => listener.close(done));
const mode = "start";
const server = spawn(process.execPath, ["--require", "./tests/fixtures/profile-backend.cjs", "node_modules/next/dist/bin/next", mode, "-p", String(port)], {
  env: { ...process.env, JOBPILOT_PROFILE_TEST: "1", JOBPILOT_EXTRACTION_TEST: "1", JOBPILOT_GENERATION_TEST: "1", OPENAI_API_KEY: "test-placeholder" },
  windowsHide: true,
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
server.stdout.on("data", (data) => { log += data; });
server.stderr.on("data", (data) => { log += data; });
try {
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null) throw new Error(log);
    try {
      await fetch(`http://127.0.0.1:${port}/api/resume/extract`, { signal: AbortSignal.timeout(2000) });
      ready = true;
      break;
    } catch {}
    await new Promise((done) => setTimeout(done, 500));
  }
  assert.ok(ready, "Next.js server must become ready");
  const token = `profile-test.${Buffer.from(JSON.stringify({ sub: "00000000-0000-4000-8000-000000000006", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.signature`;
  const response = await fetch(`http://127.0.0.1:${port}/api/resume/extract`, {
    method: "POST",
    headers: { cookie: `insforge_access_token=${token}` },
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.status, 200, log);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.data.full_name, "Test Candidate");
  assert.equal(body.data.email, "profile@example.test");
  assert.deepEqual(body.data.skills, ["React", "TypeScript"]);
  const generated = await fetch(`http://127.0.0.1:${port}/api/resume/generate`, {
    method: "POST",
    headers: { cookie: `insforge_access_token=${token}` },
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(generated.status, 200, log);
  const generatedBody = await generated.json();
  assert.equal(generatedBody.success, true);
  assert.equal(generatedBody.data.resumeUrl, "http://profile-fixture.local/resume");
  const download = await fetch(`http://127.0.0.1:${port}/api/resume/download`, {
    headers: { cookie: `insforge_access_token=${token}` },
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(download.status, 200, log);
  assert.match(await download.text(), /^%PDF-/);
  console.log(`Resume extraction and generation passed through actual Next.js ${mode} routes (external services stubbed).`);
} finally {
  if (server.exitCode === null) {
    const exited = once(server, "exit");
    server.kill();
    await exited;
  }
}
