"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/lib/store";

const schema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  adminKey: z.string().min(1, "Admin key is required"),
});
type FormData = z.infer<typeof schema>;

// Admin registration requires a secret key set in environment
export default function AdminRegisterPage() {
  const { setUser, setToken } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "admin" }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error ?? "Registration failed"); return; }
      setUser(json.data.user);
      setToken(json.data.token);
      toast.success("Admin account created!");
      window.location.href = "/admin";
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-8">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 dark:bg-purple-900/30 rounded-full mb-3">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-xs font-medium text-purple-700 dark:text-purple-400">Admin Portal</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Registration</h2>
        <p className="text-sm text-gray-500 mt-1">Requires a valid admin secret key</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Full Name" type="text" autoComplete="name" placeholder="System Administrator"
          error={errors.fullName?.message} {...register("fullName")} />
        <Input label="Email Address" type="email" autoComplete="email" placeholder="admin@example.com"
          error={errors.email?.message} {...register("email")} />
        <Input label="Admin Secret Key" type="password" placeholder="Enter admin secret key"
          error={errors.adminKey?.message} hint="Contact your system administrator for this key"
          {...register("adminKey")} />
        <div className="relative">
          <Input label="Password" type={showPassword ? "text" : "password"} autoComplete="new-password"
            placeholder="••••••••" error={errors.password?.message} {...register("password")} />
          <button type="button" onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-8 text-gray-400 hover:text-gray-600" aria-label="Toggle password">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={showPassword ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
            </svg>
          </button>
        </div>
        <Button type="submit" className="w-full" loading={isSubmitting}>Create Admin Account</Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/admin/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
      </p>
    </motion.div>
  );
}
