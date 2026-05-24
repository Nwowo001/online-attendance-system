import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Session from "@/lib/models/Session";
import { getTokenFromRequest } from "@/lib/auth/jwt";
import { generateToken, generateQRCode } from "@/lib/qr";
import { z } from "zod";

const sessionSchema = z.object({
  courseId: z.string().min(1),
  durationMinutes: z.number().min(1).max(480).default(60),
  geoFence: z
    .object({ lat: z.number(), lng: z.number(), radius: z.number() })
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    const query: Record<string, unknown> = {};
    if (user.role === "lecturer") query.lecturerId = user.userId;
    if (courseId) query.courseId = courseId;

    const sessions = await Session.find(query)
      .populate("courseId", "courseCode courseTitle")
      .sort("-createdAt")
      .limit(50);

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user || !["admin", "lecturer"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = sessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    await connectDB();

    const token = generateToken();
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60 * 1000);

    const qrCode = await generateQRCode(token, parsed.data.courseId);

    const session = await Session.create({
      courseId: parsed.data.courseId,
      lecturerId: user.userId,
      token,
      qrCode,
      startsAt,
      expiresAt,
      geoFence: parsed.data.geoFence,
      active: true,
    });

    const populated = await session.populate("courseId", "courseCode courseTitle");
    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
