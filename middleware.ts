import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/owner", roles: ["owner", "admin"] },
  { prefix: "/trainer", roles: ["trainer", "owner"] },
  { prefix: "/member", roles: ["member"] },
  { prefix: "/profile", roles: ["admin", "owner", "trainer", "member"] },
  { prefix: "/activity", roles: ["admin", "owner", "trainer", "member"] },
  { prefix: "/about", roles: ["admin", "owner", "trainer", "member"] }
] as const;

const roleHome: Record<string, string> = {
  admin: "/admin",
  member: "/member",
  owner: "/owner",
  trainer: "/trainer"
};

// Forwards the current pathname as a custom request header so server-side
// code (e.g. requireRole) can read it via next/headers without parsing the URL.
// Used by the "must change password on first login" guard for staff.
function withPathnameHeader(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const route = protectedRoutes.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!route) {
    return withPathnameHeader(request);
  }

  const session = request.cookies.get("fitsplit-session")?.value;
  const role = request.cookies.get("fitsplit-role")?.value;

  if (!session && !role) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (role && !route.roles.includes(role as never)) {
    return NextResponse.redirect(new URL(roleHome[role] ?? "/", request.url));
  }

  return withPathnameHeader(request);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/trainer/:path*",
    "/member/:path*",
    "/profile",
    "/activity",
    "/about"
  ]
};
