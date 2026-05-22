"use client";
import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput, Table } from "@/components/ui/Table";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { Input, Select } from "@/components/ui/Input";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { IUser } from "@/types";
import { formatDate } from "@/lib/utils";

const editSchema = z.object({
  fullName: z.string().min(2),
  role: z.enum(["admin", "lecturer", "student"]),
  department: z.string().optional(),
  matricNumber: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

export default function UsersPage() {
  const [users, setUsers] = useState<IUser[]>([]);
  const [filtered, setFiltered] = useState<IUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<IUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<IUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/users?${params}`);
      const json = await res.json();
      if (json.success) { setUsers(json.data); setFiltered(json.data); }
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openEdit = (user: IUser) => {
    setEditUser(user);
    reset({ fullName: user.fullName, role: user.role, department: user.department ?? "", matricNumber: user.matricNumber ?? "" });
  };

  const onEdit = async (data: EditForm) => {
    if (!editUser) return;
    const res = await fetch(`/api/users/${editUser._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("User updated");
      setEditUser(null);
      fetchUsers();
    } else {
      toast.error(json.error);
    }
  };

  const onDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    const res = await fetch(`/api/users/${deleteUser._id}`, { method: "DELETE" });
    const json = await res.json();
    setDeleting(false);
    if (json.success) {
      toast.success("User deleted");
      setDeleteUser(null);
      fetchUsers();
    } else {
      toast.error(json.error);
    }
  };

  const columns = [
    { key: "fullName", header: "Name", render: (u: IUser) => <span className="font-medium">{u.fullName}</span> },
    { key: "email", header: "Email", render: (u: IUser) => <span className="text-gray-500">{u.email}</span> },
    { key: "role", header: "Role", render: (u: IUser) => <Badge status={u.role} /> },
    { key: "department", header: "Department", render: (u: IUser) => <span className="text-gray-500">{u.department ?? "—"}</span> },
    { key: "createdAt", header: "Joined", render: (u: IUser) => <span className="text-gray-500">{formatDate(u.createdAt)}</span> },
    {
      key: "actions", header: "Actions",
      render: (u: IUser) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(u)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteUser(u)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} total users</p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input w-full sm:w-40"
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="lecturer">Lecturer</option>
            <option value="student">Student</option>
          </select>
        </div>

        {loading ? <TableSkeleton rows={6} cols={6} /> : <Table data={users} columns={columns} emptyMessage="No users found" />}
      </Card>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        <form onSubmit={handleSubmit(onEdit)} className="space-y-4">
          <Input label="Full Name" error={errors.fullName?.message} {...register("fullName")} />
          <Select
            label="Role"
            error={errors.role?.message}
            options={[
              { value: "student", label: "Student" },
              { value: "lecturer", label: "Lecturer" },
              { value: "admin", label: "Admin" },
            ]}
            {...register("role")}
          />
          <Input label="Department" {...register("department")} />
          <Input label="Matric Number" {...register("matricNumber")} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button type="submit" loading={isSubmitting}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={onDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteUser?.fullName}? This action cannot be undone.`}
        loading={deleting}
      />
    </div>
  );
}
