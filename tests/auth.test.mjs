import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { test } from "node:test";
import * as middleware from "@insforge/sdk/ssr/middleware";
import { createServerClient } from "@insforge/sdk/ssr";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { NextRequest } = require("next/server");
const { unstable_doesMiddlewareMatch } = require("next/experimental/testing/server");
const { renderToStaticMarkup } = require("react-dom/server");
const { createElement } = require("react");

// Compile the application modules in memory, replacing only request boundaries.
function loadModule(path, mocks = {}) {
  const compiled = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)(
    (name) => (Object.hasOwn(mocks, name) ? mocks[name] : require(name)),
    exports,
  );
  return exports;
}

const authLib = loadModule("lib/auth.ts");
const { proxy, config } = loadModule("proxy.ts", {
  "@insforge/sdk/ssr/middleware": middleware,
  "@/lib/auth": authLib,
});
const { LoginForm } = loadModule("components/auth/LoginForm.tsx", {
  "@/actions/auth": { signInWithOAuth: async () => ({ success: false, error: "Retry failed" }) },
  "@/lib/posthog-client": { getPostHogDistinctId: () => null },
});

function loadLogin(client) {
  return loadModule("app/(auth)/login/page.tsx", {
    "@/components/auth/LoginForm": { LoginForm },
    "@/lib/auth": authLib,
    "@/lib/insforge-config": { hasInsforgePublicConfig: () => true },
    "@/lib/insforge-server": { createInsforgeServer: async () => client },
  }).default;
}

function findForm(element) {
  if (!element?.props) return undefined;
  if (element.type === LoginForm) return element;
  const children = [element.props.children].flat();
  return children.map(findForm).find(Boolean);
}

test("root layout passes refreshed server identity and clears it after logout", async () => {
  let user = { id: "user-a", email: "user@example.test", profile: { name: "Test User" } };
  const Identity = () => null;
  const Layout = loadModule("app/layout.tsx", {
    "next/font/google": { Inter: () => ({ variable: "test-font" }) },
    "./globals.css": {},
    "@/components/auth/PostHogIdentify": { PostHogIdentify: Identity },
    "@/lib/insforge-config": { hasInsforgePublicConfig: () => true },
    "@/lib/posthog-config": { getPostHogConfig: () => ({ projectToken: "test", host: "https://posthog.example.test" }) },
    "@/lib/insforge-server": {
      createInsforgeServer: async () => ({ auth: { getCurrentUser: async () => ({ data: { user }, error: null }) } }),
    },
  }).default;
  const signedIn = await Layout({ children: "Page" });
  assert.deepEqual(signedIn.props.children.props.children[0].props.user, {
    id: "user-a", email: "user@example.test", name: "Test User",
  });
  user = null;
  const signedOut = await Layout({ children: "Page" });
  assert.equal(signedOut.props.children.props.children[0].props.user, null);
});

function configureBackend(t, fetchMock) {
  for (const [key, value] of Object.entries({
    NEXT_PUBLIC_INSFORGE_URL: "https://auth.example.test",
    NEXT_PUBLIC_INSFORGE_ANON_KEY: "test-public-key",
  })) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    });
  }
  t.mock.method(globalThis, "fetch", fetchMock);
}

test("proxy matches login and protected routes, excluding homepage and callback", () => {
  for (const url of ["/login", "/dashboard", "/profile", "/find-jobs/123"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), true);
  }
  for (const url of ["/", "/callback", "/api/auth/refresh"]) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), false);
  }
});

test("refresh-only login forwards renewed cookies and redirects the verified user", async (t) => {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const accessToken = `test.${payload}.signature`;
  configureBackend(t, async (url, init) => {
    if (new URL(url).pathname === "/api/auth/refresh") {
      assert.equal(JSON.parse(init.body).refresh_token, "refresh-only");
      return Response.json({ accessToken, refreshToken: "rotated-refresh", user: { id: "test-user" } });
    }
    assert.equal(new URL(url).pathname, "/api/auth/sessions/current");
    assert.equal(new Headers(init.headers).get("authorization"), `Bearer ${accessToken}`);
    return Response.json({ user: { id: "test-user" } });
  });
  const request = new NextRequest("http://localhost/login", {
    headers: { cookie: "insforge_refresh_token=refresh-only" },
  });
  const response = await proxy(request);
  assert.equal(response.cookies.get("insforge_access_token").value, accessToken);
  assert.equal(response.cookies.get("insforge_refresh_token").value, "rotated-refresh");
  assert.equal(response.cookies.get("insforge_refresh_token").httpOnly, true);

  const upstream = new NextRequest("http://localhost/login", {
    headers: { cookie: response.headers.get("x-middleware-request-cookie") },
  });
  assert.equal(upstream.cookies.get("insforge_access_token").value, accessToken);
  const LoginPage = loadLogin(createServerClient({ cookies: upstream.cookies }));
  await assert.rejects(LoginPage({ searchParams: Promise.resolve({}) }), {
    digest: "NEXT_REDIRECT;replace;/dashboard;307;",
  });
});

test("revoked refresh cookies are deleted on the redirect and not retried", async (t) => {
  let calls = 0;
  configureBackend(t, async () => {
    calls++;
    return Response.json({ error: "INVALID_REFRESH_TOKEN", message: "Revoked", statusCode: 401 }, { status: 401 });
  });
  const response = await proxy(new NextRequest("http://localhost/dashboard", {
    headers: { cookie: "insforge_refresh_token=revoked" },
  }));
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location")).pathname, "/login");
  for (const name of ["insforge_access_token", "insforge_refresh_token"]) {
    const cookie = response.cookies.get(name);
    assert.equal(cookie.value, "");
    assert.equal(cookie.maxAge, 0);
  }
  const login = await proxy(new NextRequest("http://localhost/login"));
  assert.equal(login.status, 200);
  assert.equal(calls, 1);
});

test("protected profile navigation preserves the destination through login", async (t) => {
  configureBackend(t, async () => {
    return Response.json(
      { error: "MISSING_REFRESH_TOKEN", message: "Missing", statusCode: 401 },
      { status: 401 },
    );
  });

  const response = await proxy(new NextRequest("http://localhost/profile?section=resume"));
  const location = new URL(response.headers.get("location"));

  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("next"), "/profile?section=resume");
});

test("login and callback honor safe protected next destinations", async () => {
  const user = { id: "test-user", email: "user@example.test", profile: { name: "Test User" } };
  const LoginPage = loadLogin({
    auth: { getCurrentUser: async () => ({ data: { user: null }, error: null }) },
  });
  const page = await LoginPage({
    searchParams: Promise.resolve({ next: "/profile?section=resume" }),
  });
  const form = findForm(page);

  assert.equal(form.props.nextPath, "/profile?section=resume");

  const { GET } = loadModule("app/(auth)/callback/route.ts", {
    "@insforge/sdk/ssr": {
      createAuthActions: () => ({
        exchangeOAuthCode: async () => ({ data: { user }, error: null }),
      }),
    },
    "@/lib/auth": authLib,
    "@/lib/posthog-server": {
      capturePostHogServerException: async () => {},
      identifyPostHogServerUser: async () => {},
    },
  });
  const response = await GET(new NextRequest(
    "http://localhost/callback?insforge_code=code&next=/profile%3Fsection%3Dresume",
    { headers: { cookie: "jobpilot_oauth_code_verifier=verifier" } },
  ));

  assert.equal(new URL(response.headers.get("location")).pathname, "/profile");
  assert.equal(new URL(response.headers.get("location")).search, "?section=resume");
});

test("anonymous login renders normally without a refresh request", async (t) => {
  configureBackend(t, async () => assert.fail("Anonymous login must not refresh"));
  const response = await proxy(new NextRequest("http://localhost/login"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.has("location"), false);
});

test("callback error appears as a readable alert in the login form", async () => {
  const LoginPage = loadLogin({ auth: { getCurrentUser: async () => ({ data: { user: null } }) } });
  const page = await LoginPage({ searchParams: Promise.resolve({ error: "oauth_callback" }) });
  const form = findForm(page);
  assert.equal(form.props.initialError, "We couldn't complete your sign-in. Please try again.");
  const html = renderToStaticMarkup(createElement(LoginForm, form.props));
  assert.match(html, /role="alert"/);
  assert.match(html, /complete your sign-in\. Please try again\./);
});

test("unknown or repeated error parameters are not rendered as user messages", async () => {
  const LoginPage = loadLogin({ auth: { getCurrentUser: async () => ({ data: { user: null } }) } });
  for (const error of [undefined, "raw-backend-error", ["oauth_callback", "raw-backend-error"]]) {
    const form = findForm(await LoginPage({ searchParams: Promise.resolve({ error }) }));
    assert.equal(form.props.initialError, undefined);
  }
});

test("homepage navigation and the sign-in destination resolve to implemented pages", () => {
  function pageRoutes(directory, segments = []) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      if (!entry.isDirectory()) return [];
      const path = join(directory, entry.name);
      const next = entry.name.startsWith("(") ? segments : [...segments, entry.name];
      return [
        ...(existsSync(join(path, "page.tsx")) ? [`/${next.join("/")}`] : []),
        ...pageRoutes(path, next),
      ];
    });
  }
  const routes = new Set(["/", ...pageRoutes("app")]);
  assert.ok(routes.has("/dashboard"), "Successful sign-in needs a dashboard destination");
  for (const [path, name] of [
    ["components/layout/Navbar.tsx", "Navbar"],
    ["components/layout/Footer.tsx", "Footer"],
    ["components/homepage/CtaLinks.tsx", "CtaLinks"],
  ]) {
    const Component = loadModule(path, {
      "@/components/layout/WorkspaceNav": { WorkspaceNav: () => null },
    })[name];
    const html = renderToStaticMarkup(createElement(Component));
    for (const [, href] of html.matchAll(/href="(\/[^"?#]*)"/g)) {
      assert.ok(routes.has(href), `${name} links to missing page ${href}`);
    }
  }
});

test("workspace only renders for a verified user", async () => {
  for (const [user, error] of [[null, null], [null, new Error("Expired session")], [{ id: "test-user" }, null]]) {
    const Layout = loadModule("app/(workspace)/layout.tsx", {
      "@/components/layout/Navbar": { Navbar: () => null },
      "@/lib/insforge-config": { hasInsforgePublicConfig: () => true },
      "@/lib/insforge-server": {
        createInsforgeServer: async () => ({ auth: { getCurrentUser: async () => ({ data: { user }, error }) } }),
      },
    }).default;
    if (!user) {
      await assert.rejects(Layout({ children: "Workspace content" }), {
        digest: "NEXT_REDIRECT;replace;/login;307;",
      });
    } else {
      const html = renderToStaticMarkup(await Layout({ children: "Workspace content" }));
      assert.match(html, /Workspace content/);
    }
  }
});

test("workspace pending destinations render their unavailable state and profile renders its UI", async () => {
  const { PendingPage } = loadModule("components/layout/PendingPage.tsx");
  for (const [route, title] of [["dashboard", "Dashboard"], ["find-jobs", "Find Jobs"]]) {
    const Page = loadModule(`app/(workspace)/${route}/page.tsx`, {
      "@/components/layout/PendingPage": { PendingPage },
    }).default;
    const html = renderToStaticMarkup(createElement(Page));
    assert.ok(html.includes(title));
    assert.match(html, /Coming soon/);
    assert.match(html, /href="\/"/);
  }

  const ProfilePage = loadModule("app/(workspace)/profile/page.tsx", {
    "@/lib/profile": loadModule("lib/profile.ts"),
    "@/lib/insforge-server": { createInsforgeServer: async () => ({
      auth: { getCurrentUser: async () => ({ data: { user: { id: "test-user", email: "user@example.test" } }, error: null }) },
      database: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) },
    }) },
    "@/components/profile/ProfilePageContent": {
      ProfilePageContent: () => createElement("main", null, "Profile Information"),
    },
  }).default;
  const profileHtml = renderToStaticMarkup(await ProfilePage());

  assert.match(profileHtml, /Profile Information/);
});
