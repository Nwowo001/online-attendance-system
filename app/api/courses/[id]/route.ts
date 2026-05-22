import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Course from "@/lib/models/Course";
import { getTokenFromRequest } from "@/lib/auth/jwt";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await connectDB();
    const course = await Course.findById(id).populate("lecturerId", "fullName email");
    if (!course) return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: course });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getTokenFromRequest(req);
    if (!user || !["admin", "lecturer"].includes(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    await connectDB();

    const course = await Course.findByIdAndUpdate(id, body, { new: true });
    if (!course) return NextResponse.json({ success: false, error: "Course not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: course });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getTokenFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await connectDB();
    await Course.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "Course deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
