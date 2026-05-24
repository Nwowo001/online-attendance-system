export type Role = "admin" | "lecturer" | "student";

export interface IUser {
  _id: string;
  fullName: string;
  email: string;
  password?: string;
  matricNumber?: string;
  department?: string;
  role: Role;
  createdAt: string;
}

export interface ICourse {
  _id: string;
  courseCode: string;
  courseTitle: string;
  lecturerId: string | IUser;
  createdAt: string;
}

export interface IEnrollment {
  _id: string;
  studentId: string | IUser;
  courseId: string | ICourse;
}

export interface ISession {
  _id: string;
  courseId: string | ICourse;
  lecturerId: string | IUser;
  token: string;
  qrCode: string;
  startsAt: string;
  expiresAt: string;
  geoFence?: { lat: number; lng: number; radius: number };
  active: boolean;
  createdAt: string;
}

export interface IAttendance {
  _id: string;
  sessionId: string | ISession;
  studentId: string | IUser;
  status: "present" | "late" | "excused";
  checkedInAt: string;
  deviceInfo?: string;
  ipAddress?: string;
  geoLocation?: { lat: number; lng: number };
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  fullName: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  percentage: number;
}

export interface DashboardStats {
  totalUsers?: number;
  totalCourses?: number;
  totalSessions?: number;
  totalAttendance?: number;
  recentActivity?: unknown[];
}
