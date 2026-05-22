"use client";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";
import { ICourse, IEnrollment } from "@/types";
import { formatDate } from "@/lib/utils";

export default function StudentCoursesPage() {
  const [enrollments, setEnrollments] = useState<IEnrollment[]>([]);
  const [allCourses, setAllCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [unenrolling, setUnenrolling] = useState<string | null>(null);

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/enrollments");
      const json = await res.json();
      if (json.success) setEnrollments(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllCourses = useCallback(async () => {
    try {
      const res = await fetch("/api/courses", { credentials: "same-origin" });
      const json = await res.json();
      if (json.success) {
        setAllCourses(json.data);
      } else {
        toast.error(json.error ?? "Unable to load courses");
      }
    } catch {
      toast.error("Unable to load courses. Please try again.");
    }
  }, []);

  useEffect(() => {
    fetchEnrollments();
    fetchAllCourses();
  }, [fetchEnrollments, fetchAllCourses]);

  const openEnroll = () => {
    fetchAllCourses();
    setShowEnroll(true);
  };

  const enrolledCourseIds = new Set(
    enrollments.map((e) => (e.courseId as { _id: string })?._id ?? e.courseId),
  );

  const availableCourses = allCourses.filter(
    (c) => !enrolledCourseIds.has(c._id),
  );

  const enroll = async (courseId: string) => {
    setEnrolling(courseId);
    try {
      const res = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Enrolled successfully");
        fetchEnrollments();
        fetchAllCourses();
      } else {
        toast.error(json.error);
      }
    } finally {
      setEnrolling(null);
    }
  };

  const unenroll = async (courseId: string) => {
    setUnenrolling(courseId);
    try {
      const res = await fetch(`/api/enrollments?courseId=${courseId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Unenrolled");
        fetchEnrollments();
      } else {
        toast.error(json.error);
      }
    } finally {
      setUnenrolling(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Courses
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {enrollments.length} enrolled courses
          </p>
        </div>
        <Button onClick={openEnroll}>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Enroll in Course
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 space-y-3">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-6 w-2/3" />
            </div>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <Card className="text-center py-16">
          <svg
            className="w-12 h-12 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <p className="text-gray-500 mb-4">
            You are not enrolled in any courses yet.
          </p>
          <Button onClick={openEnroll}>Browse Courses</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {enrollments.map((enrollment) => {
              const course = enrollment.courseId as ICourse;
              return (
                <Card
                  key={enrollment._id}
                  className="hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-mono text-sm font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-lg">
                      {course?.courseCode}
                    </span>
                    <Badge status="present" label="Enrolled" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {course?.courseTitle}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Lecturer:{" "}
                    {(course?.lecturerId as { fullName?: string })?.fullName ??
                      "—"}
                  </p>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => unenroll(course?._id)}
                    loading={unenrolling === course?._id}
                    className="w-full"
                  >
                    Unenroll
                  </Button>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {enrollments.length === 0 && allCourses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Available Courses
              </h2>
              <p className="text-sm text-gray-500">
                Courses you can enroll in right now
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {availableCourses.map((course) => (
              <Card
                key={course._id}
                className="hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-lg">
                    {course.courseCode}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {course.courseTitle}
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Lecturer:{" "}
                  {(course.lecturerId as { fullName?: string })?.fullName ??
                    "Unknown lecturer"}
                </p>
                <Button
                  size="sm"
                  onClick={() => enroll(course._id)}
                  loading={enrolling === course._id}
                >
                  Enroll
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={showEnroll}
        onClose={() => setShowEnroll(false)}
        title="Enroll in a Course"
        size="lg"
      >
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {availableCourses.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              No available courses to enroll in
            </p>
          )}
          {availableCourses.map((course) => (
            <div
              key={course._id}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  <span className="font-mono text-primary-700 dark:text-primary-400">
                    {course.courseCode}
                  </span>
                  {" – "}
                  {course.courseTitle}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(course.lecturerId as { fullName?: string })?.fullName ??
                    "Unknown lecturer"}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => enroll(course._id)}
                loading={enrolling === course._id}
              >
                Enroll
              </Button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
