import { NextResponse } from "next/server";
import { getTokenFromRequest } from "./jwt";
import { NextRequest } from "next/server";
import { Role } from "@/types";

export function withAuth(
  handler: (req: NextRequest, context: { params: Record<string, string> }, user: ReturnType<typeof getTokenFromRequest>) => Promise<NextResponse>,
  allowedRoles?: Role[]
) {
  return async (req: NextRequest, context: { params: Record<string, string> }) => {
    const user = getTokenFromRequest(req);

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    return handler(req, context, user);
  };
}
