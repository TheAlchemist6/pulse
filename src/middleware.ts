import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow auth-related routes through without a session check
  // The /api/auth/* routes are handled by NextAuth directly
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow public routes
  if (
    pathname === "/" ||
    pathname === "/signin" ||
    pathname.startsWith("/api/export") // export is still gated by session in handler
  ) {
    return NextResponse.next();
  }

  // All other routes require a valid session
  if (!req.auth) {
    const signInUrl = new URL("/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - Static assets (.png, .jpg, .svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)).*)",
  ],
};
