"use client";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AttendanceBarChart, AttendancePieChart } from "@/components/charts/AttendanceCharts";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";
import { IAttendance } from "@/types";

interface ReportData {
  totalCourses: number;
  totalSessions: number;
  totalAttendance: number;
  totalStudents: number;
  totalUsers: number;
  attendanceCounts: { _id: string; count: number; present: number; late: number }[];
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [detailed, setDetailed] = useState<IAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, detailedRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/reports?type=detailed"),
      ]);
      const [summary, detail] = await Promise.all([summaryRes.json(), detailedRes.json()]);
      if (summary.success) setData(summary.data);
      if (detail.success) setDetailed(detail.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const Papa = (await import("papaparse")).default;
      const rows = detailed.map((a) => ({
        Student: (a.studentId as { fullName?: string })?.fullName ?? "",
        Email: (a.studentId as { email?: string })?.email ?? "",
        MatricNumber: (a.studentId as { matricNumber?: string })?.matricNumber ?? "",
        Course: (a.sessionId as { courseId?: { courseCode?: string } })?.courseId?.courseCode ?? "",
        Status: a.status,
        CheckedInAt: formatDateTime(a.checkedInAt),
      }));
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-report-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } finally {
      setExporting(false);
    }
  };

  const pieData = data
    ? [
        { name: "Present", value: data.attendanceCounts.reduce((s, a) => s + a.present, 0) },
        { name: "Late", value: data.attendanceCounts.reduce((s, a) => s + (a.count - a.present), 0) },
      ]
    : [];

  const barData = data?.attendanceCounts.slice(0, 8).map((a, i) => ({
    name: `Session ${i + 1}`,
    present: a.present,
    late: a.count - a.present,
    absent: 0,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">System-wide attendance overview</p>
        </div>
        <Button onClick={exportCSV} loading={exporting} variant="secondary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TableSkeleton rows={4} cols={2} />
          <TableSkeleton rows={4} cols={2} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Attendance by Session</h3>
              <AttendanceBarChart data={barData} />
            </Card>
            <Card>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Status Distribution</h3>
              <AttendancePieChart data={pieData} />
            </Card>
          </div>

          <Card>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Detailed Attendance Records</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Student</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Course</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-gray-500 font-medium">Checked In</th>
                  </tr>
                </thead>
                <tbody>
                  {detailed.slice(0, 20).map((a) => (
                    <tr key={a._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 px-3 font-medium">{(a.studentId as { fullName?: string })?.fullName}</td>
                      <td className="py-2 px-3 text-gray-500">{(a.sessionId as { courseId?: { courseCode?: string } })?.courseId?.courseCode}</td>
                      <td className="py-2 px-3"><Badge status={a.status} /></td>
                      <td className="py-2 px-3 text-gray-500">{formatDateTime(a.checkedInAt)}</td>
                    </tr>
                  ))}
                  {detailed.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-8 text-gray-400">No attendance records</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
