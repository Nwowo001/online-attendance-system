"use client";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ICourse } from "@/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const schema = z.object({
  courseCode: z.string().min(2).max(20),
  courseTitle: z.string().min(3).max(100),
});
type FormData = z.infer<typeof schema>;

export default function LecturerCoursesPage() {
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/courses");
      const json = await res.json();
      if (json.success) setCourses(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const onCreate = async (data: FormData) => {
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Course created successfully");
      setShowCreate(false);
      reset();
      fetchCourses();
    } else {
      toast.error(json.error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Courses</h1>
          <p className="text-sm text-gray-500 mt-1">{courses.length} courses</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Course
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="card p-6 space-y-3"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-6 w-2/3" /><div className="skeleton h-3 w-1/2" /></div>)}
        </div>
      ) : courses.length === 0 ? (
        <Card className="text-center py-16">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-gray-500 mb-4">No courses yet. Create your first course.</p>
          <Button onClick={() => setShowCreate(true)}>Create Course</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Card key={course._id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <span className="font-mono text-sm font-bold text-primary-700 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-lg">
                  {course.courseCode}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{course.courseTitle}</h3>
              <p className="text-xs text-gray-500 mb-4">Created {formatDate(course.createdAt)}</p>
              <div className="flex gap-2">
                <Link href={`/lecturer/sessions?courseId=${course._id}`} className="flex-1">
                  <Button size="sm" className="w-full">View Sessions</Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Create New Course">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <Input label="Course Code" placeholder="e.g. CSC301" error={errors.courseCode?.message} {...register("courseCode")} />
          <Input label="Course Title" placeholder="e.g. Data Structures and Algorithms" error={errors.courseTitle?.message} {...register("courseTitle")} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => { setShowCreate(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Create Course</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
