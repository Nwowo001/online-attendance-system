import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Course from "@/lib/models/Course";
import Enrollment from "@/lib/models/Enrollment";
import { getTokenFromRequest } from "@/lib/auth/jwt";
import { z } from "zod";

const courseSchema = z.object({
  courseCode: z.string().min(2).max(20),
  courseTitle: z.string().min(3).max(100),
  lecturerId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    await connectDB();

    let courses;
    if (user?.role === "admin") {
      courses = await Course.find().populate("lecturerId", "fullName email").sort("-createdAt");
    } else if (user?.role === "lecturer") {
      courses = await Course.find({ lecturerId: user.userId }).sort("-createdAt");
    } else {
      courses = await Course.find().populate("lecturerId", "fullName email").sort("-createdAt");
    }

    return NextResponse.json({ success: true, data: courses });
  } catch (error) {
    console.error("Get courses error:", error);
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
    const parsed = courseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
    }

    await connectDB();

    const existing = await Course.findOne({ courseCode: parsed.data.courseCode.toUpperCase() });
    if (existing) {
      return NextResponse.json({ success: false, error: "Course code already exists" }, { status: 409 });
    }

    // Admin can assign to any lecturer, lecturer creates their own course
    const lecturerId = user.role === "admin" ? parsed.data.lecturerId : user.userId;

    const course = await Course.create({
      courseCode: parsed.data.courseCode,
      courseTitle: parsed.data.courseTitle,
      lecturerId,
    }).then((doc) => doc.populate("lecturerId", "fullName email"));

    return NextResponse.json({ success: true, data: course }, { status: 201 });
  } catch (error) {
    console.error("Create course error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
