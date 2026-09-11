import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadModule(path, env, mocks = {}) {
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function("require", "exports", "process", "window", "localStorage", compiled)(
    (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    exports,
    { env },
    { location: { hostname: "localhost" } },
    mocks.localStorage,
  );
  return exports;
}

test("server client shutdown does not leave process exception listeners", async () => {
  const events = ["uncaughtException", "uncaughtExceptionMonitor", "unhandledRejection"];
  const before = events.map((event) => process.listenerCount(event));
  const { createPostHogServerClient } = loadModule("lib/posthog-server.ts", {}, {
    "@/lib/posthog-config": {
      getPostHogConfig: () => ({ projectToken: "review-placeholder", host: "https://posthog.example.test" }),
    },
  });
  for (let i = 0; i < 12; i++) {
    const client = createPostHogServerClient();
    await client.shutdown();
  }
  assert.deepEqual(events.map((event) => process.listenerCount(event)), before);
});

test("explicit server exception capture still reports and flushes errors", async () => {
  const calls = [];
  const failure = new Error("Test failure");
  class PostHog {
    captureException(...args) { calls.push(["exception", ...args]); }
    async shutdown() { calls.push(["shutdown"]); }
  }
  const server = loadModule("lib/posthog-server.ts", {}, {
    "@/lib/posthog-config": {
      getPostHogConfig: () => ({ projectToken: "test-key", host: "https://posthog.example.test" }),
    },
    "posthog-node": { PostHog },
  });
  await server.capturePostHogServerException(failure, "user-a", { flow: "login" });
  assert.deepEqual(calls, [["exception", failure, "user-a", { flow: "login" }], ["shutdown"]]);
});

test("mounted identity component resets on logout and before switching accounts", () => {
  const calls = [];
  const storage = new Map();
  let previousDependencies;
  const { PostHogIdentify } = loadModule("components/auth/PostHogIdentify.tsx", {}, {
    react: {
      useEffect(effect, dependencies) {
        if (!previousDependencies || dependencies.some((value, i) => value !== previousDependencies[i])) {
          effect();
          previousDependencies = dependencies;
        }
      },
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    "@/lib/posthog-client": {
      hasPostHogBrowserConfig: () => true,
      identifyPostHogUser: (id) => calls.push(["identify", id]),
      resetPostHogUser: () => calls.push(["reset"]),
      capturePostHogClientException: (error) => assert.fail(error.message),
    },
  });
  PostHogIdentify({ user: { id: "user-a" } });
  PostHogIdentify({ user: { id: "user-a" } });
  PostHogIdentify({ user: null });
  PostHogIdentify({ user: null });
  assert.equal(storage.size, 0);
  assert.deepEqual(calls, [["identify", "user-a"], ["reset"]]);
  PostHogIdentify({ user: { id: "user-b" } });
  PostHogIdentify({ user: { id: "user-c" } });
  assert.deepEqual(calls.slice(2), [["identify", "user-b"], ["reset"], ["identify", "user-c"]]);
});

for (const [name, key, legacyKey, host, expectedKey] of [
  ["preferred key", "current", undefined, "https://us.i.posthog.com", "current"],
  ["existing project token", undefined, "legacy", "https://us.i.posthog.com", "legacy"],
  ["preferred key takes precedence", "current", "legacy", "https://us.i.posthog.com", "current"],
  ["blank preferred key falls back", " ", "legacy", "https://us.i.posthog.com", "legacy"],
  ["missing key disables analytics", undefined, undefined, "https://us.i.posthog.com", null],
  ["missing host disables analytics", "current", undefined, undefined, null],
  ["blank host disables analytics", "current", undefined, " ", null],
]) {
  test(`PostHog: ${name}`, async (t) => {
    const env = {
      NODE_ENV: "development",
      NEXT_PUBLIC_POSTHOG_KEY: key,
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: legacyKey,
      NEXT_PUBLIC_POSTHOG_HOST: host,
    };
    const config = loadModule("lib/posthog-config.ts", env);
    assert.equal(config.getPostHogConfig()?.projectToken ?? null, expectedKey);

    const init = t.mock.fn();
    const identify = t.mock.fn();
    const shutdown = t.mock.fn(async () => {});
    const warning = t.mock.method(console, "warn", () => {});
    const errors = t.mock.method(console, "error", () => {});
    class PostHog {
      constructor(token, options) {
        assert.equal(token, expectedKey);
        assert.equal(options.host, host);
      }
      identify = identify;
      shutdown = shutdown;
    }
    const mocks = {
      "@/lib/posthog-config": config,
      "posthog-node": { PostHog },
      "posthog-js": { default: { init, identify } },
    };
    const server = loadModule("lib/posthog-server.ts", env, mocks);
    const browser = loadModule("lib/posthog-client.ts", env, mocks);
    loadModule("instrumentation-client.ts", env, mocks);
    await server.identifyPostHogServerUser("test-user");
    browser.identifyPostHogUser("test-user");

    const enabled = expectedKey !== null;
    assert.equal(browser.hasPostHogBrowserConfig(), enabled);
    assert.equal(init.mock.callCount(), enabled ? 1 : 0);
    assert.equal(identify.mock.callCount(), enabled ? 2 : 0);
    assert.equal(shutdown.mock.callCount(), enabled ? 1 : 0);
    assert.equal(warning.mock.callCount(), enabled ? 0 : 1);
    assert.equal(errors.mock.callCount(), 0);
    if (enabled) assert.equal(init.mock.calls[0].arguments[0], expectedKey);
  });
}
