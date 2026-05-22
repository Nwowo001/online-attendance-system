import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/Attendance";
import { getTokenFromRequest } from "@/lib/auth/jwt";

export async function GET(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = getTokenFromRequest(req);
    if (!user || !["admin", "lecturer"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { sessionId } = await params;
    await connectDB();

    const records = await Attendance.find({ sessionId })
      .populate("studentId", "fullName email matricNumber department")
      .sort("checkedInAt");

    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const user = getTokenFromRequest(req);
    if (!user || !["admin", "lecturer"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { sessionId } = await params;
    const { attendanceId, status } = await req.json();
    await connectDB();

    const record = await Attendance.findOneAndUpdate(
      { _id: attendanceId, sessionId },
      { status },
      { new: true }
    );

    if (!record) return NextResponse.json({ success: false, error: "Record not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
