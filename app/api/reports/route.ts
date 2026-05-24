import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Attendance from "@/lib/models/Attendance";
import Session from "@/lib/models/Session";
import Course from "@/lib/models/Course";
import Enrollment from "@/lib/models/Enrollment";
import User from "@/lib/models/User";
import { getTokenFromRequest } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    const type = searchParams.get("type") ?? "summary";

    if (user.role === "student") {
      const enrollments = await Enrollment.find({ studentId: user.userId });
      const courseIds = enrollments.map((e) => e.courseId);
      const sessions = await Session.find({ courseId: { $in: courseIds } });
      const sessionIds = sessions.map((s) => s._id);
      const attendance = await Attendance.find({ studentId: user.userId, sessionId: { $in: sessionIds } })
        .populate({ path: "sessionId", populate: { path: "courseId", select: "courseCode courseTitle" } })
        .sort("-checkedInAt");

      const stats = courseIds.map((cId) => {
        const courseSessions = sessions.filter((s) => s.courseId.toString() === cId.toString());
        const courseAttendance = attendance.filter(
          (a) => (a.sessionId as unknown as { courseId: { _id: string } }).courseId?._id?.toString() === cId.toString()
        );
        return {
          courseId: cId,
          total: courseSessions.length,
          attended: courseAttendance.length,
          percentage: courseSessions.length > 0 ? Math.round((courseAttendance.length / courseSessions.length) * 100) : 0,
        };
      });

      return NextResponse.json({ success: true, data: { attendance, stats } });
    }

    if (user.role === "lecturer" || user.role === "admin") {
      const courseQuery = user.role === "lecturer" ? { lecturerId: user.userId } : {};
      const courses = courseId
        ? await Course.find({ _id: courseId })
        : await Course.find(courseQuery);

      const cIds = courses.map((c) => c._id);
      const sessions = await Session.find({ courseId: { $in: cIds } });
      const sIds = sessions.map((s) => s._id);

      if (type === "detailed") {
        const records = await Attendance.find({ sessionId: { $in: sIds } })
          .populate("studentId", "fullName email matricNumber department")
          .populate({ path: "sessionId", populate: { path: "courseId", select: "courseCode courseTitle" } })
          .sort("-checkedInAt");
        return NextResponse.json({ success: true, data: records });
      }

      const attendanceCounts = await Attendance.aggregate([
        { $match: { sessionId: { $in: sIds } } },
        { $group: { _id: "$sessionId", count: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } }, late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } } } },
      ]);

      const totalStudents = await Enrollment.countDocuments({ courseId: { $in: cIds } });
      const totalUsers = user.role === "admin" ? await User.countDocuments() : undefined;

      return NextResponse.json({
        success: true,
        data: {
          totalCourses: courses.length,
          totalSessions: sessions.length,
          totalAttendance: attendanceCounts.reduce((sum, a) => sum + a.count, 0),
          totalStudents,
          totalUsers,
          attendanceCounts,
          courses,
          sessions,
        },
      });
    }

    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Reports error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
