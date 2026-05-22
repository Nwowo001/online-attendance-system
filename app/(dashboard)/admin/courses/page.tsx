"use client";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput, Table } from "@/components/ui/Table";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { ICourse } from "@/types";
import { formatDate } from "@/lib/utils";

const schema = z.object({
  courseCode: z.string().min(2).max(20),
  courseTitle: z.string().min(3).max(100),
  lecturerId: z.string().min(1, "Lecturer is required"),
});
type FormData = z.infer<typeof schema>;

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteCourse, setDeleteCourse] = useState<ICourse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [fetchingLecturers, setFetchingLecturers] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
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

  const fetchLecturers = useCallback(async () => {
    setFetchingLecturers(true);
    try {
      const res = await fetch("/api/users?role=lecturer");
      const json = await res.json();
      if (json.success) setLecturers(json.data);
    } finally {
      setFetchingLecturers(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
    fetchLecturers();
  }, [fetchCourses, fetchLecturers]);

  const filtered = courses.filter(
    (c) =>
      c.courseCode.toLowerCase().includes(search.toLowerCase()) ||
      c.courseTitle.toLowerCase().includes(search.toLowerCase()),
  );

  const onCreate = async (data: FormData) => {
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Course created");
      setShowCreate(false);
      reset();
      fetchCourses();
    } else {
      toast.error(json.error);
    }
  };

  const onDelete = async () => {
    if (!deleteCourse) return;
    setDeleting(true);
    const res = await fetch(`/api/courses/${deleteCourse._id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    setDeleting(false);
    if (json.success) {
      toast.success("Course deleted");
      setDeleteCourse(null);
      fetchCourses();
    } else {
      toast.error(json.error);
    }
  };

  const columns = [
    {
      key: "courseCode",
      header: "Code",
      render: (c: ICourse) => (
        <span className="font-mono font-medium text-primary-700 dark:text-primary-400">
          {c.courseCode}
        </span>
      ),
    },
    {
      key: "courseTitle",
      header: "Title",
      render: (c: ICourse) => (
        <span className="font-medium">{c.courseTitle}</span>
      ),
    },
    {
      key: "lecturerId",
      header: "Lecturer",
      render: (c: ICourse) => (
        <span className="text-gray-500">
          {(c.lecturerId as { fullName?: string })?.fullName ?? "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (c: ICourse) => (
        <span className="text-gray-500">{formatDate(c.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (c: ICourse) => (
        <Button size="sm" variant="danger" onClick={() => setDeleteCourse(c)}>
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Courses
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {courses.length} total courses
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
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
          Add Course
        </Button>
      </div>

      <Card>
        <div className="mb-6">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search courses..."
          />
        </div>
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : (
          <Table
            data={filtered}
            columns={columns}
            emptyMessage="No courses found"
          />
        )}
      </Card>

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          reset();
        }}
        title="Create Course"
      >
       <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <Input
            label="Course Code"
            placeholder="e.g. CSC301"
            error={errors.courseCode?.message}
            {...register("courseCode")}
          />
          <Input
            label="Course Title"
            placeholder="e.g. Data Structures"
            error={errors.courseTitle?.message}
            {...register("courseTitle")}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign Lecturer</label>
            <select
              {...register("lecturerId")}
              disabled={fetchingLecturers}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select a lecturer...</option>
              {lecturers.map((lecturer) => (
                <option key={lecturer._id} value={lecturer._id}>
                  {lecturer.fullName} ({lecturer.email})
                </option>
              ))}
            </select>
            {errors.lecturerId && <p className="text-sm text-red-500 mt-1">{errors.lecturerId.message}</p>}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              type="button"
              onClick={() => {
                setShowCreate(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Course
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteCourse}
        onClose={() => setDeleteCourse(null)}
        onConfirm={onDelete}
        title="Delete Course"
        message={`Delete "${deleteCourse?.courseTitle}"? All associated sessions and attendance records will be affected.`}
        loading={deleting}
      />
    </div>
  );
}
