import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/login",
  "/register",
  "/",
  "/lecturer/login",
  "/lecturer/register",
  "/admin/login",
  "/admin/register",
];
const rolePaths: Record<string, string[]> = {
  admin: ["/admin"],
  lecturer: ["/lecturer"],
  student: ["/student"],
};

// Decode JWT payload without verification (verification happens in API routes via jsonwebtoken)
// Middleware only needs to check if a valid-looking token exists and read the role
function decodeJWTPayload(
  token: string,
): { userId: string; email: string; role: string; fullName: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Base64url decode the payload
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);
    // Check expiry
    if (parsed.exp && parsed.exp * 1000 < Date.now()) return null;
    if (!parsed.userId || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some((p) => pathname === p) ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const user = decodeJWTPayload(token);

  if (!user) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("auth-token");
    return response;
  }

  for (const [role, paths] of Object.entries(rolePaths)) {
    if (
      paths.some((p) => pathname.startsWith(p)) &&
      user.role !== role &&
      user.role !== "admin"
    ) {
      return NextResponse.redirect(new URL(`/${user.role}`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)",
  ],
};
