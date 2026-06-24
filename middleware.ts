import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth(function middleware(req) {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Pass API routes and auth pages through without interference
  if (pathname.startsWith("/api/")) return NextResponse.next();
  if (pathname === "/login" || pathname === "/setup") return NextResponse.next();

  // Redirect unauthenticated visitors to the login page
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect authenticated users away from the landing/login pages
  if (pathname === "/" || pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
