export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeLeft(expiresAt: string | Date): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function calculateAttendancePercentage(present: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    present: "text-green-600 bg-green-50",
    late: "text-yellow-600 bg-yellow-50",
    excused: "text-blue-600 bg-blue-50",
    absent: "text-red-600 bg-red-50",
    active: "text-green-600 bg-green-50",
    expired: "text-red-600 bg-red-50",
    inactive: "text-gray-600 bg-gray-50",
    admin: "text-purple-600 bg-purple-50",
    lecturer: "text-blue-600 bg-blue-50",
    student: "text-green-600 bg-green-50",
  };
  return colors[status] ?? "text-gray-600 bg-gray-50";
}

export function getSessionStatus(session: {
  active: boolean;
  expiresAt: string | Date;
}): "active" | "expired" | "inactive" {
  if (!session.active) return "inactive";
  if (new Date(session.expiresAt) < new Date()) return "expired";
  return "active";
}
