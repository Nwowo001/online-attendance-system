"use client";
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export function AuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser?: { user: import("@/types").IUser; token: string } | null }) {
  const { setUser, setToken, user } = useAuthStore();
  const router = useRouter();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (initialUser) {
      setUser(initialUser.user);
      setToken(initialUser.token ?? null);
    } else if (!user) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          if (data.success) setUser(data.data);
          else router.push("/login");
        })
        .catch(() => router.push("/login"));
    }
  }, [initialUser, setUser, setToken, user, router]);

  return <>{children}</>;
}
