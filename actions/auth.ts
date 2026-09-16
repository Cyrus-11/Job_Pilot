"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAuthActions } from "@insforge/sdk/ssr";

import {
  OAUTH_CODE_VERIFIER_COOKIE,
  POSTHOG_DISTINCT_ID_COOKIE,
  parseSafeAuthRedirect,
} from "@/lib/auth";
import { hasInsforgePublicConfig } from "@/lib/insforge-config";
import { createInsforgeServer } from "@/lib/insforge-server";
import { capturePostHogServerException } from "@/lib/posthog-server";

type OAuthProvider = "google" | "github";

export type AuthActionState = {
  success: boolean;
  error?: string;
};

function parseOAuthProvider(value: FormDataEntryValue | null): OAuthProvider | null {
  if (value === "google" || value === "github") {
    return value;
  }

  return null;
}

function parsePostHogDistinctId(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const distinctId = value.trim();
  return distinctId && distinctId.length <= 200 ? distinctId : null;
}

function parseRedirectPath(value: FormDataEntryValue | null): string {
  return parseSafeAuthRedirect(typeof value === "string" ? value : null);
}

async function capturePostHogException(
  error: unknown,
  distinctId: string | null | undefined,
): Promise<void> {
  await capturePostHogServerException(error, distinctId, { auth_flow: "oauth" });
}

async function getRequestOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (!host) {
    return "http://localhost:3000";
  }

  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  return `${protocol}://${host}`;
}

export async function signInWithOAuth(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const provider = parseOAuthProvider(formData.get("provider"));
  const posthogDistinctId = parsePostHogDistinctId(
    formData.get("posthogDistinctId"),
  );
  let oauthUrl: string | null = null;

  try {
    if (!hasInsforgePublicConfig()) {
      return {
        success: false,
        error: "InsForge auth is not configured yet.",
      };
    }

    if (!provider) {
      return {
        success: false,
        error: "Choose a supported sign-in provider.",
      };
    }

    const cookieStore = await cookies();
    const auth = createAuthActions({ cookies: cookieStore });
    const next = parseRedirectPath(formData.get("next"));
    const callbackUrl = new URL("/callback", await getRequestOrigin());
    callbackUrl.searchParams.set("next", next);
    const redirectTo = callbackUrl.toString();
    const { data, error } = await auth.signInWithOAuth(provider, {
      redirectTo,
      skipBrowserRedirect: true,
      ...(provider === "google"
        ? { additionalParams: { prompt: "select_account" } }
        : {}),
    });

    if (error || !data.url || !data.codeVerifier) {
      console.error("[actions/auth] OAuth initialization failed", error);
      await capturePostHogException(
        error ?? new Error("OAuth initialization returned incomplete data"),
        posthogDistinctId,
      );

      return {
        success: false,
        error: "Could not start sign in. Please try again.",
      };
    }

    cookieStore.set(OAUTH_CODE_VERIFIER_COOKIE, data.codeVerifier, {
      httpOnly: true,
      maxAge: 60 * 10,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    if (posthogDistinctId) {
      cookieStore.set(POSTHOG_DISTINCT_ID_COOKIE, posthogDistinctId, {
        httpOnly: true,
        maxAge: 60 * 10,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    oauthUrl = data.url;
  } catch (error) {
    console.error("[actions/auth]", error);
    await capturePostHogException(error, posthogDistinctId);

    return {
      success: false,
      error: "Could not start sign in. Please try again.",
    };
  }

  redirect(oauthUrl);
}

export async function signOut(): Promise<void> {
  let distinctId: string | null = null;

  try {
    const insforge = await createInsforgeServer();
    const {
      data: { user },
    } = await insforge.auth.getCurrentUser();
    distinctId = user?.id ?? null;

    const auth = createAuthActions({ cookies: await cookies() });
    const { error } = await auth.signOut();

    if (error) {
      console.error("[actions/auth] Sign out failed", error);
      await capturePostHogException(error, distinctId);
    }
  } catch (error) {
    console.error("[actions/auth]", error);
    await capturePostHogException(error, distinctId);
  }

  redirect("/");
}
