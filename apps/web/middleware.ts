import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get("access_token")?.value;
  const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;

  if (accessToken) {
    try {
      const apiUrl = new URL(
        "/api/auth/me",
        process.env.API_INTERNAL_URL ??
          (process.env.NODE_ENV === "production"
            ? "http://api:3001"
            : "http://127.0.0.1:3001"),
      );
      const response = await fetch(apiUrl, {
        headers: {
          cookie: `access_token=${encodeURIComponent(accessToken)}`,
        },
        cache: "no-store",
      });

      if (response.ok) {
        return NextResponse.next();
      }
    } catch {
      return new NextResponse("Unable to verify your session. Please try again.", {
        status: 503,
      });
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", returnTo);
  const redirect = NextResponse.redirect(loginUrl);

  if (accessToken) {
    redirect.cookies.delete("access_token");
  }

  return redirect;
}

export const config = {
  matcher: ["/dashboard/:path*", "/workflows/:path*"],
};
