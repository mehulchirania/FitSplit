import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/owner", roles: ["owner"] },
  { prefix: "/member", roles: ["member"] },
  { prefix: "/profile", roles: ["admin", "owner", "member"] },
  { prefix: "/activity", roles: ["admin", "owner", "member"] },
  { prefix: "/about", roles: ["admin", "owner", "member"] }
] as const;

const roleHome: Record<string, string> = {
  admin: "/admin",
  member: "/member",
  owner: "/owner"
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const route = protectedRoutes.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!route) {
    return NextResponse.next();
  }

  const session = request.cookies.get("fitsplit-session")?.value;
  const role = request.cookies.get("fitsplit-role")?.value;

  if (!session && !role) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (role && !route.roles.includes(role as never)) {
    return NextResponse.redirect(new URL(roleHome[role] ?? "/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/owner/:path*",
    "/member/:path*",
    "/profile",
    "/activity",
    "/about"
  ]
};
