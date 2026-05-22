"use client";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AttendanceAreaChart } from "@/components/charts/AttendanceCharts";
import { formatDateTime, formatTimeLeft } from "@/lib/utils";
import Link from "next/link";
import { ISession } from "@/types";

interface Props {
  recentSessions: (ISession & { courseId: { courseCode: string; courseTitle: string } })[];
  attendanceTrend: { name: string; present: number; late: number }[];
}

export function LecturerDashboardClient({ recentSessions, attendanceTrend }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Attendance Trend</h3>
        <AttendanceAreaChart data={attendanceTrend} />
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Sessions</h3>
          <Link href="/lecturer/sessions">
            <Button size="sm" variant="ghost">View all</Button>
          </Link>
        </div>
        <div className="space-y-3">
          {recentSessions.length === 0 && <p className="text-sm text-gray-400">No sessions yet</p>}
          {recentSessions.map((s) => {
            const isActive = s.active && new Date(s.expiresAt) > new Date();
            return (
              <div key={s._id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{(s.courseId as { courseCode: string })?.courseCode}</span>
                  <Badge status={isActive ? "active" : "expired"} />
                </div>
                <p className="text-xs text-gray-500">{formatDateTime(s.startsAt)}</p>
                {isActive && (
                  <p className="text-xs text-orange-500 mt-1">Expires in {formatTimeLeft(s.expiresAt)}</p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
