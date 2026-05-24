import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/Attendance";
import Session from "@/lib/models/Session";
import Enrollment from "@/lib/models/Enrollment";
import { getTokenFromRequest } from "@/lib/auth/jwt";
import { z } from "zod";

const checkinSchema = z.object({
  token: z.string().min(1),
  geoLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user || user.role !== "student") {
      return NextResponse.json({ success: false, error: "Only students can check in" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 400 });
    }

    await connectDB();

    const session = await Session.findOne({ token: parsed.data.token });
    if (!session) {
      return NextResponse.json({ success: false, error: "Invalid attendance token" }, { status: 404 });
    }

    if (!session.active || new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ success: false, error: "Session has expired" }, { status: 410 });
    }

    const enrolled = await Enrollment.findOne({
      studentId: user.userId,
      courseId: session.courseId,
    });
    if (!enrolled) {
      return NextResponse.json({ success: false, error: "You are not enrolled in this course" }, { status: 403 });
    }

    const existing = await Attendance.findOne({
      sessionId: session._id,
      studentId: user.userId,
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Already checked in for this session" }, { status: 409 });
    }

    const now = new Date();
    const lateThreshold = new Date(session.startsAt.getTime() + 15 * 60 * 1000);
    const status = now > lateThreshold ? "late" : "present";

    const ipAddress = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    const deviceInfo = req.headers.get("user-agent") ?? "unknown";

    const attendance = await Attendance.create({
      sessionId: session._id,
      studentId: user.userId,
      status,
      checkedInAt: now,
      deviceInfo,
      ipAddress,
      geoLocation: parsed.data.geoLocation,
    });

    return NextResponse.json({ success: true, data: attendance, message: `Checked in as ${status}` }, { status: 201 });
  } catch (error) {
    console.error("Checkin error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
