import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/lib/models/Session";
import { getTokenFromRequest } from "@/lib/auth/jwt";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const session = await Session.findById(id).populate("courseId", "courseCode courseTitle");
    if (!session) return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getTokenFromRequest(req);
    if (!user || !["admin", "lecturer"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    await connectDB();

    const session = await Session.findByIdAndUpdate(id, body, { new: true });
    if (!session) return NextResponse.json({ success: false, error: "Session not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
