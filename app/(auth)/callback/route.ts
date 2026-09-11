import { type NextRequest, NextResponse } from "next/server";
import { createAuthActions } from "@insforge/sdk/ssr";

import {
  OAUTH_CODE_VERIFIER_COOKIE,
  POSTHOG_DISTINCT_ID_COOKIE,
} from "@/lib/auth";
import {
  capturePostHogServerException,
  identifyPostHogServerUser,
} from "@/lib/posthog-server";

async function captureCallbackException(
  error: unknown,
  distinctId: string | undefined,
): Promise<void> {
  await capturePostHogServerException(error, distinctId, {
    auth_flow: "oauth_callback",
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("insforge_code");
  const codeVerifier = request.cookies.get(OAUTH_CODE_VERIFIER_COOKIE)?.value;
  const anonymousDistinctId = request.cookies.get(
    POSTHOG_DISTINCT_ID_COOKIE,
  )?.value;
  const destination = new URL("/dashboard", request.url);
  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(destination);

  try {
    if (!code || !codeVerifier) {
      await captureCallbackException(
        new Error("OAuth callback is missing required parameters"),
        anonymousDistinctId,
      );
      loginUrl.searchParams.set("error", "oauth_callback");
      return NextResponse.redirect(loginUrl);
    }

    const auth = createAuthActions({
      requestCookies: request.cookies,
      responseCookies: response.cookies,
    });
    const { data, error } = await auth.exchangeOAuthCode(code, codeVerifier);

    response.cookies.delete(OAUTH_CODE_VERIFIER_COOKIE);
    response.cookies.delete(POSTHOG_DISTINCT_ID_COOKIE);

    if (error || !data?.user) {
      console.error("[auth/callback] OAuth exchange failed", error);
      await captureCallbackException(
        error ?? new Error("OAuth exchange returned no user"),
        anonymousDistinctId,
      );
      loginUrl.searchParams.set("error", "oauth_callback");
      return NextResponse.redirect(loginUrl);
    }

    await identifyPostHogServerUser(data.user.id, {
      email: data.user.email,
      ...(data.user.profile?.name ? { name: data.user.profile.name } : {}),
    });

    return response;
  } catch (error) {
    console.error("[auth/callback]", error);
    await captureCallbackException(error, anonymousDistinctId);
    loginUrl.searchParams.set("error", "oauth_callback");
    return NextResponse.redirect(loginUrl);
  }
}
