import { getServerSession } from "@/lib/auth/jwt";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/components/dashboard/AuthProvider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <AuthProvider>{children}</AuthProvider>;
}
