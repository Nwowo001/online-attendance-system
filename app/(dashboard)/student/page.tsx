import { getServerSession } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db";
import Enrollment from "@/lib/models/Enrollment";
import Session from "@/lib/models/Session";
import Attendance from "@/lib/models/Attendance";
import { StatCard } from "@/components/ui/Card";
import { StudentDashboardClient } from "./StudentDashboardClient";

async function getStats(studentId: string) {
  await connectDB();
  const enrollments = await Enrollment.find({ studentId }).populate("courseId", "courseCode courseTitle").lean();
  const courseIds = enrollments.map((e) => e.courseId);
  const sessions = await Session.find({ courseId: { $in: courseIds } }).lean();
  const sessionIds = sessions.map((s) => s._id);
  const attendanceRecords = await Attendance.find({ studentId, sessionId: { $in: sessionIds } })
    .populate({ path: "sessionId", populate: { path: "courseId", select: "courseCode courseTitle" } })
    .sort("-checkedInAt")
    .limit(10)
    .lean();

  const present = attendanceRecords.filter((a) => a.status === "present").length;
  const late = attendanceRecords.filter((a) => a.status === "late").length;
  const overallPct = sessions.length > 0 ? Math.round(((present + late) / sessions.length) * 100) : 0;

  return {
    totalCourses: enrollments.length,
    totalSessions: sessions.length,
    attended: present + late,
    overallPct,
    recentAttendance: JSON.parse(JSON.stringify(attendanceRecords)),
    enrollments: JSON.parse(JSON.stringify(enrollments)),
  };
}

export default async function StudentDashboard() {
  const session = await getServerSession();
  const stats = await getStats(session!.userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.fullName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Enrolled Courses" value={stats.totalCourses} color="bg-blue-50 text-blue-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <StatCard title="Total Sessions" value={stats.totalSessions} color="bg-green-50 text-green-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard title="Attended" value={stats.attended} color="bg-purple-50 text-purple-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard title="Overall Attendance" value={`${stats.overallPct}%`} color="bg-orange-50 text-orange-600"
          subtitle={stats.overallPct >= 75 ? "Good standing" : "Needs improvement"}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
      </div>

      <StudentDashboardClient recentAttendance={stats.recentAttendance} enrollments={stats.enrollments} />
    </div>
  );
}
