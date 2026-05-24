"use client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AttendanceAreaChart } from "@/components/charts/AttendanceCharts";
import { formatDateTime } from "@/lib/utils";
import { IUser, ISession } from "@/types";

interface Props {
  recentUsers: IUser[];
  recentSessions: (ISession & {
    courseId: { courseCode: string; courseTitle: string };
    lecturerId: { fullName: string };
  })[];
  attendanceByDay: {
    name: string;
    present: number;
    late: number;
    total: number;
  }[];
}

export function AdminDashboardClient({
  recentUsers,
  recentSessions,
  attendanceByDay,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Attendance Trend (Last 7 Days)
        </h3>
        <AttendanceAreaChart data={attendanceByDay} />
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Recent Users
        </h3>
        <div className="space-y-3">
          {recentUsers.length === 0 && (
            <p className="text-sm text-gray-400">No users yet</p>
          )}
          {recentUsers.map((u) => (
            <div key={u._id} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-400 text-sm font-medium flex-shrink-0">
                {u.fullName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {u.fullName}
                </p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <Badge status={u.role} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="lg:col-span-3">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          Recent Sessions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">
                  Course
                </th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">
                  Lecturer
                </th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">
                  Started
                </th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">
                  Expires
                </th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {recentSessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400">
                    No sessions yet
                  </td>
                </tr>
              )}
              {recentSessions.map((s) => (
                <tr
                  key={s._id}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="py-2 px-3 font-medium">
                    {(s.courseId as { courseCode: string })?.courseCode}
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    {(s.lecturerId as { fullName: string })?.fullName}
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    {formatDateTime(s.startsAt)}
                  </td>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    {formatDateTime(s.expiresAt)}
                  </td>
                  <td className="py-2 px-3">
                    <Badge
                      status={
                        s.active && new Date(s.expiresAt) > new Date()
                          ? "active"
                          : "expired"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
