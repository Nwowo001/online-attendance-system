import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import { signToken } from "@/lib/auth/jwt";
import { z } from "zod";

const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  matricNumber: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(["student", "lecturer", "admin"]).optional(),
  adminKey: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    await connectDB();

    const existing = await User.findOne({ email: parsed.data.email });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 },
      );
    }

    // Validate admin key if registering as admin
    if (parsed.data.role === "admin") {
      const adminKey = process.env.ADMIN_SECRET_KEY;
      if (!adminKey || parsed.data.adminKey !== adminKey) {
        return NextResponse.json(
          { success: false, error: "Invalid admin secret key" },
          { status: 403 },
        );
      }
    }

    // Default to student role if not specified
    const role = parsed.data.role || "student";
    const user = await User.create({ ...parsed.data, role });

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    const response = NextResponse.json(
      { success: true, data: { user: user.toJSON(), token } },
      { status: 201 },
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
