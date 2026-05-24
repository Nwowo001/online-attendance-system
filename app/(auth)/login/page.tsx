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
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormData = z.infer<typeof schema>;

export default function StudentLoginPage() {
  const { setUser, setToken } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, expectedRole: "student" }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error ?? "Login failed"); return; }
      setUser(json.data.user);
      setToken(json.data.token);
      toast.success(`Welcome back, ${json.data.user.fullName}!`);
      window.location.href = "/student";
    } catch {
      toast.error("Network error. Please try again.");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Student Login</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in to your student account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input label="Email Address" type="email" autoComplete="email" placeholder="you@example.com"
          error={errors.email?.message} {...register("email")} />
        <div className="relative">
          <Input label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password"
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
        <Button type="submit" className="w-full" loading={isSubmitting}>Sign In</Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary-600 hover:text-primary-700 font-medium">Register</Link>
      </p>
      <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
        <Link href="/lecturer/login" className="hover:text-primary-600">Lecturer Login</Link>
        <span>·</span>
        <Link href="/admin/login" className="hover:text-primary-600">Admin Login</Link>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Demo Student</p>
        <p className="text-xs text-blue-600 dark:text-blue-300">student@demo.com / password123</p>
      </div>
    </motion.div>
  );
}
