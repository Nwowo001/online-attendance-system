import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User, { UserDocument } from "@/lib/models/User";
import { signToken } from "@/lib/auth/jwt";
import { z } from "zod";
import bcrypt from "bcryptjs";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  expectedRole: z.enum(["admin", "lecturer", "student"]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input" },
        { status: 400 },
      );
    }

    await connectDB();
    const roleFilter = parsed.data.expectedRole || "student";
    const user = await User.findOne({
      email: parsed.data.email,
      role: roleFilter,
    })
      .select("+password")
      .lean<UserDocument & { password: string }>();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(parsed.data.password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 },
      );
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    });

    // Strip password before sending
    const { password: _pw, ...safeUser } = user;

    const response = NextResponse.json({
      success: true,
      data: { user: safeUser, token },
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
