export const OAUTH_CODE_VERIFIER_COOKIE = "jobpilot_oauth_code_verifier";
export const POSTHOG_DISTINCT_ID_COOKIE = "jobpilot_posthog_distinct_id";

const PROTECTED_PATHS = ["/dashboard", "/profile", "/find-jobs"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (protectedPath: string) =>
      pathname === protectedPath || pathname.startsWith(`${protectedPath}/`),
  );
}

export function parseSafeAuthRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  try {
    const url = new URL(value, "http://jobpilot.local");
    const destination = `${url.pathname}${url.search}${url.hash}`;

    return isProtectedPath(url.pathname) ? destination : "/dashboard";
  } catch {
    return "/dashboard";
  }
}
