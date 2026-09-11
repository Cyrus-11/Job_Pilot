import { updateSession } from "@insforge/sdk/ssr/middleware";
import { type NextRequest, NextResponse } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/profile", "/find-jobs"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (protectedPath: string) =>
      pathname === protectedPath || pathname.startsWith(`${protectedPath}/`),
  );
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next();
  const { accessToken } = await updateSession({
    requestCookies: request.cookies,
    responseCookies: response.cookies,
  });

  // Forward the cookies after refresh so this render sees the renewed session.
  let finalResponse = NextResponse.next({ request: { headers: request.headers } });

  if (isProtectedPath(request.nextUrl.pathname) && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);

    finalResponse = NextResponse.redirect(loginUrl);
  }

  for (const cookie of response.cookies.getAll()) {
    finalResponse.cookies.set(cookie);
  }

  return finalResponse;
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/profile/:path*", "/find-jobs/:path*"],
};
