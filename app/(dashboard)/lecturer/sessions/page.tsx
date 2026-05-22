"use client";
import { Suspense } from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ISession, ICourse, IAttendance } from "@/types";
import { formatDateTime, formatTimeLeft, getSessionStatus } from "@/lib/utils";
import Image from "next/image";

const sessionSchema = z.object({
  courseId: z.string().min(1, "Select a course"),
  durationMinutes: z.coerce.number().min(1).max(480),
});
type SessionForm = z.infer<typeof sessionSchema>;

function SessionsContent() {
  const searchParams = useSearchParams();
  const preselectedCourse = searchParams.get("courseId") ?? "";

  const [sessions, setSessions] = useState<ISession[]>([]);
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeSession, setActiveSession] = useState<ISession | null>(null);
  const [attendance, setAttendance] = useState<IAttendance[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { courseId: preselectedCourse, durationMinutes: 60 },
  });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const json = await res.json();
      if (json.success) setSessions(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    const res = await fetch("/api/courses");
    const json = await res.json();
    if (json.success) setCourses(json.data);
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchCourses();
  }, [fetchSessions, fetchCourses]);

  const fetchAttendance = useCallback(async (sessionId: string) => {
    setLoadingAttendance(true);
    try {
      const res = await fetch(`/api/attendance/${sessionId}`);
      const json = await res.json();
      if (json.success) setAttendance(json.data);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    fetchAttendance(activeSession._id);
    const interval = setInterval(() => fetchAttendance(activeSession._id), 10000);
    return () => clearInterval(interval);
  }, [activeSession, fetchAttendance]);

  useEffect(() => {
    if (!activeSession) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const update = () => setTimeLeft(formatTimeLeft(activeSession.expiresAt));
    update();
    timerRef.current = setInterval(update, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession]);

  const onCreate = async (data: SessionForm) => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Session created");
      setShowCreate(false);
      reset();
      fetchSessions();
    } else {
      toast.error(json.error);
    }
  };

  const endSession = async (sessionId: string) => {
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Session ended");
      setActiveSession(null);
      fetchSessions();
    }
  };

  const updateStatus = async (attendanceId: string, status: string) => {
    if (!activeSession) return;
    const res = await fetch(`/api/attendance/${activeSession._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attendanceId, status }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Status updated");
      fetchAttendance(activeSession._id);
    }
  };

  const exportCSV = async () => {
    if (!activeSession || attendance.length === 0) return;
    const Papa = (await import("papaparse")).default;
    const rows = attendance.map((a) => ({
      Student: (a.studentId as { fullName?: string })?.fullName ?? "",
      MatricNumber: (a.studentId as { matricNumber?: string })?.matricNumber ?? "",
      Status: a.status,
      CheckedInAt: formatDateTime(a.checkedInAt),
    }));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${activeSession._id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">{sessions.length} total sessions</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Session
        </Button>
      </div>

      {loading ? (
        <Card>
          <TableSkeleton rows={5} cols={4} />
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-gray-500 mb-4">No sessions yet. Create your first attendance session.</p>
          <Button onClick={() => setShowCreate(true)}>Create Session</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sessions.map((session) => {
            const status = getSessionStatus(session);
            const course = session.courseId as { courseCode: string; courseTitle: string };
            return (
              <Card key={session._id} className="hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-lg">
                    {course?.courseCode}
                  </span>
                  <Badge status={status} />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{course?.courseTitle}</p>
                <p className="text-xs text-gray-500 mb-1">Started: {formatDateTime(session.startsAt)}</p>
                <p className="text-xs text-gray-500 mb-4">Expires: {formatDateTime(session.expiresAt)}</p>
                {status === "active" && (
                  <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-xs text-orange-600 font-medium">
                      Time left: {formatTimeLeft(session.expiresAt)}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setActiveSession(session)}
                  >
                    View Attendance
                  </Button>
                  {status === "active" && (
                    <Button size="sm" variant="danger" onClick={() => endSession(session._id)}>
                      End
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Session Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); reset(); }}
        title="Create Attendance Session"
      >
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <Select
            label="Course"
            error={errors.courseId?.message}
            options={[
              { value: "", label: "Select a course..." },
              ...courses.map((c) => ({
                value: c._id,
                label: `${c.courseCode} – ${c.courseTitle}`,
              })),
            ]}
            {...register("courseId")}
          />
          <Select
            label="Duration"
            options={[
              { value: "30", label: "30 minutes" },
              { value: "60", label: "1 hour" },
              { value: "90", label: "1.5 hours" },
              { value: "120", label: "2 hours" },
              { value: "180", label: "3 hours" },
            ]}
            {...register("durationMinutes")}
          />
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => { setShowCreate(false); reset(); }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Session
            </Button>
          </div>
        </form>
      </Modal>

      {/* Live Attendance Modal */}
      <Modal
        open={!!activeSession}
        onClose={() => setActiveSession(null)}
        title="Live Attendance"
        size="lg"
      >
        {activeSession && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Session Token</p>
                <p className="font-mono font-bold text-lg text-primary-700 dark:text-primary-400 tracking-widest">
                  {activeSession.token}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <p className="text-xs text-gray-500 mb-1">Time Remaining</p>
                <p className="font-bold text-lg text-orange-600">{timeLeft}</p>
              </div>
            </div>

            {activeSession.qrCode && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <Image
                    src={activeSession.qrCode}
                    alt="QR Code for attendance"
                    width={200}
                    height={200}
                  />
                  <p className="text-center text-xs text-gray-500 mt-2">Scan to check in</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900 dark:text-white">
                Attendance ({attendance.length} checked in)
              </p>
              <Button size="sm" variant="secondary" onClick={exportCSV}>
                Export CSV
              </Button>
            </div>

            {loadingAttendance ? (
              <TableSkeleton rows={3} cols={3} />
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900">
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Student</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-6 text-gray-400">
                          No check-ins yet
                        </td>
                      </tr>
                    )}
                    {attendance.map((a) => (
                      <tr key={a._id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 px-3">
                          <p className="font-medium">
                            {(a.studentId as { fullName?: string })?.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(a.studentId as { matricNumber?: string })?.matricNumber}
                          </p>
                        </td>
                        <td className="py-2 px-3">
                          <Badge status={a.status} />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={a.status}
                            onChange={(e) => updateStatus(a._id, e.target.value)}
                            className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800"
                            aria-label="Update attendance status"
                          >
                            <option value="present">Present</option>
                            <option value="late">Late</option>
                            <option value="excused">Excused</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function LecturerSessionsPage() {
  return (
    <Suspense fallback={<div className="p-8"><TableSkeleton rows={5} cols={4} /></div>}>
      <SessionsContent />
    </Suspense>
  );
}
