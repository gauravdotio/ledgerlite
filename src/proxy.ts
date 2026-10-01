import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Optimistic check only: redirects signed-out visitors before the page renders.
// The authoritative check is requireUserId() in every page and action, because
// proxy can be skipped (e.g. a matcher mistake) and must never be the only guard.
const PUBLIC_PATHS = ["/", "/login", "/signup"];
const AUTH_PAGES = ["/login", "/signup"];

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const signedIn = Boolean(req.auth?.user);

  if (signedIn && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }
  if (!signedIn && !PUBLIC_PATHS.includes(pathname)) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  // Skip API routes (they check auth themselves), Next internals and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico)$).*)"],
};
