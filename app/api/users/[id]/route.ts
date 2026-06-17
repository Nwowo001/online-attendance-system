import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { getTokenFromRequest } from "@/lib/auth/jwt";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = getTokenFromRequest(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    delete body.password;

    await connectDB();

    let updateQuery: any = { ...body };
    if (body.deviceId === null || body.deviceId === "") {
      delete updateQuery.deviceId;
      updateQuery.$unset = { deviceId: "" };
    }

    const updated = await User.findByIdAndUpdate(id, updateQuery, { new: true });
    if (!updated) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
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
    await User.findByIdAndDelete(id);

    return NextResponse.json({ success: true, message: "User deleted" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
