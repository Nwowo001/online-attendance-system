import { getServerSession } from "@/lib/auth/jwt";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import Course from "@/lib/models/Course";
import Session from "@/lib/models/Session";
import Attendance from "@/lib/models/Attendance";
import { StatCard } from "@/components/ui/Card";
import { AdminDashboardClient } from "./AdminDashboardClient";

async function getStats() {
  await connectDB();
  const [totalUsers, totalCourses, totalSessions, totalAttendance] = await Promise.all([
    User.countDocuments(),
    Course.countDocuments(),
    Session.countDocuments(),
    Attendance.countDocuments(),
  ]);

  const recentUsers = await User.find().sort("-createdAt").limit(5).lean();
  const recentSessions = await Session.find()
    .populate("courseId", "courseCode courseTitle")
    .populate("lecturerId", "fullName")
    .sort("-createdAt")
    .limit(5)
    .lean();

  const attendanceByDay = await Attendance.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$checkedInAt" } },
        present: { $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 7 },
  ]);

  return {
    totalUsers,
    totalCourses,
    totalSessions,
    totalAttendance,
    recentUsers: JSON.parse(JSON.stringify(recentUsers)),
    recentSessions: JSON.parse(JSON.stringify(recentSessions)),
    attendanceByDay: attendanceByDay.map((d) => ({ name: d._id, present: d.present, late: d.late, total: d.total })),
  };
}

export default async function AdminDashboard() {
  const session = await getServerSession();
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {session?.fullName}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          color="bg-purple-50 text-purple-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          color="bg-blue-50 text-blue-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <StatCard
          title="Total Sessions"
          value={stats.totalSessions}
          color="bg-green-50 text-green-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard
          title="Attendance Records"
          value={stats.totalAttendance}
          color="bg-orange-50 text-orange-600"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <AdminDashboardClient
        recentUsers={stats.recentUsers}
        recentSessions={stats.recentSessions}
        attendanceByDay={stats.attendanceByDay}
      />
    </div>
  );
}
