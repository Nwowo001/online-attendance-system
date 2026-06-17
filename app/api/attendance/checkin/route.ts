import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/Attendance";
import Session from "@/lib/models/Session";
import Enrollment from "@/lib/models/Enrollment";
import User from "@/lib/models/User";
import { getTokenFromRequest } from "@/lib/auth/jwt";
import { z } from "zod";

const checkinSchema = z.object({
  token: z.string().min(1),
  deviceId: z.string().min(1, "Device ID is required"),
  geoLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
});

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user || user.role !== "student") {
      return NextResponse.json({ success: false, error: "Only students can check in" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = checkinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid checkin request data" }, { status: 400 });
    }

    const { token, deviceId, geoLocation } = parsed.data;

    await connectDB();

    // 1. Verify User and Bind Device ID if not bound
    const studentUser = await User.findById(user.userId);
    if (!studentUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!studentUser.deviceId) {
      studentUser.deviceId = deviceId;
      await studentUser.save();
    } else if (studentUser.deviceId !== deviceId) {
      return NextResponse.json({
        success: false,
        error: "This account is locked to a different device. Please contact your lecturer or administrator to reset your registered device."
      }, { status: 403 });
    }

    // 2. Verify Session
    const session = await Session.findOne({ token });
    if (!session) {
      return NextResponse.json({ success: false, error: "Invalid attendance token" }, { status: 404 });
    }

    if (!session.active || new Date(session.expiresAt) < new Date()) {
      return NextResponse.json({ success: false, error: "Session has expired" }, { status: 410 });
    }

    // 3. Geofence Validation
    if (session.geoFence) {
      if (!geoLocation) {
        return NextResponse.json({ success: false, error: "Location services must be enabled to check in" }, { status: 400 });
      }
      const distance = getDistanceInMeters(
        session.geoFence.lat,
        session.geoFence.lng,
        geoLocation.lat,
        geoLocation.lng
      );
      if (distance > session.geoFence.radius) {
        return NextResponse.json({
          success: false,
          error: `You are outside the classroom boundary (${Math.round(distance)}m away, limit is ${session.geoFence.radius}m)`
        }, { status: 403 });
      }
    }

    // 4. Enrollment Check
    const enrolled = await Enrollment.findOne({
      studentId: user.userId,
      courseId: session.courseId,
    });
    if (!enrolled) {
      return NextResponse.json({ success: false, error: "You are not enrolled in this course" }, { status: 403 });
    }

    // 5. Duplicate Check-in Check
    const existing = await Attendance.findOne({
      sessionId: session._id,
      studentId: user.userId,
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Already checked in for this session" }, { status: 409 });
    }

    // 6. Device Reuse Check (one check-in per device per session)
    const existingDevice = await Attendance.findOne({
      sessionId: session._id,
      deviceId,
    });
    if (existingDevice) {
      return NextResponse.json({ success: false, error: "This device has already been used to check in for this session" }, { status: 409 });
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
      geoLocation,
      deviceId,
    });

    return NextResponse.json({ success: true, data: attendance, message: `Checked in as ${status}` }, { status: 201 });
  } catch (error) {
    console.error("Checkin error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
