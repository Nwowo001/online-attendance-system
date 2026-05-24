import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Enrollment from "@/lib/models/Enrollment";
import { getTokenFromRequest } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const studentId = searchParams.get("studentId") ?? (user.role === "student" ? user.userId : null);

    const query: Record<string, unknown> = {};
    if (courseId) query.courseId = courseId;
    if (studentId) query.studentId = studentId;

    const enrollments = await Enrollment.find(query)
      .populate("studentId", "fullName email matricNumber")
      .populate("courseId", "courseCode courseTitle");

    return NextResponse.json({ success: true, data: enrollments });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const studentId = user.role === "student" ? user.userId : body.studentId;
    const { courseId } = body;

    if (!studentId || !courseId) {
      return NextResponse.json({ success: false, error: "studentId and courseId required" }, { status: 400 });
    }

    await connectDB();

    const existing = await Enrollment.findOne({ studentId, courseId });
    if (existing) {
      return NextResponse.json({ success: false, error: "Already enrolled" }, { status: 409 });
    }

    const enrollment = await Enrollment.create({ studentId, courseId });
    return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const studentId = user.role === "student" ? user.userId : searchParams.get("studentId");

    await connectDB();
    await Enrollment.findOneAndDelete({ studentId, courseId });

    return NextResponse.json({ success: true, message: "Unenrolled" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
