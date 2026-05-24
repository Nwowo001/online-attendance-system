"use client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { IAttendance, IEnrollment } from "@/types";

interface Props {
  recentAttendance: IAttendance[];
  enrollments: IEnrollment[];
}

export function StudentDashboardClient({ recentAttendance, enrollments }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Attendance</h3>
          <Link href="/student/attendance">
            <Button size="sm" variant="ghost">View all</Button>
          </Link>
        </div>
        <div className="space-y-3">
          {recentAttendance.length === 0 && <p className="text-sm text-gray-400">No attendance records yet</p>}
          {recentAttendance.map((a) => (
            <div key={a._id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {(a.sessionId as { courseId?: { courseCode?: string } })?.courseId?.courseCode ?? "—"}
                </p>
                <p className="text-xs text-gray-500">{formatDateTime(a.checkedInAt)}</p>
              </div>
              <Badge status={a.status} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">My Courses</h3>
          <Link href="/student/courses">
            <Button size="sm" variant="ghost">Manage</Button>
          </Link>
        </div>
        <div className="space-y-4">
          {enrollments.length === 0 && <p className="text-sm text-gray-400">Not enrolled in any courses</p>}
          {enrollments.map((e) => {
            const course = e.courseId as { _id: string; courseCode: string; courseTitle: string };
            return (
              <div key={e._id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{course?.courseCode}</p>
                    <p className="text-xs text-gray-500">{course?.courseTitle}</p>
                  </div>
                </div>
                <ProgressBar value={75} showLabel />
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Quick Check-In</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="flex-1 p-6 bg-primary-50 dark:bg-primary-900/20 rounded-2xl text-center">
            <svg className="w-10 h-10 text-primary-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <p className="text-sm font-medium text-primary-700 dark:text-primary-400 mb-2">Scan QR Code</p>
            <p className="text-xs text-gray-500 mb-3">Use your camera to scan the session QR code</p>
            <Link href="/student/attendance">
              <Button size="sm">Open Scanner</Button>
            </Link>
          </div>
          <div className="flex-1 p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl text-center">
            <svg className="w-10 h-10 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Enter Token</p>
            <p className="text-xs text-gray-500 mb-3">Manually enter the 8-character session token</p>
            <Link href="/student/attendance">
              <Button size="sm" variant="secondary">Enter Token</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
