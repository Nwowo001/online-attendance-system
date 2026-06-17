import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import path from "path";

// Load .env.local first if it exists, otherwise fallback to .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ?? "mongodb://localhost:27017/attendance-dev";

if (!process.env.MONGODB_URI) {
  console.warn("MONGODB_URI not set in environment, using default localhost");
}

const UserSchema = new mongoose.Schema(
  {
    fullName: String,
    email: { type: String, unique: true },
    password: String,
    matricNumber: String,
    department: String,
    role: { type: String, enum: ["admin", "lecturer", "student"] },
  },
  { timestamps: true },
);

const CourseSchema = new mongoose.Schema(
  {
    courseCode: { type: String, unique: true },
    courseTitle: String,
    lecturerId: mongoose.Schema.Types.ObjectId,
  },
  { timestamps: true },
);

const EnrollmentSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  courseId: mongoose.Schema.Types.ObjectId,
});
EnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const User = mongoose.models.User ?? mongoose.model("User", UserSchema);
const Course = mongoose.models.Course ?? mongoose.model("Course", CourseSchema);
const Enrollment =
  mongoose.models.Enrollment ?? mongoose.model("Enrollment", EnrollmentSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Enrollment.deleteMany({}),
  ]);
  console.log("Cleared existing data");

  const hashedPassword = await bcrypt.hash("password123", 12);

  // Create users
  const admin = await User.create({
    fullName: "System Admin",
    email: "admin@demo.com",
    password: hashedPassword,
    role: "admin",
    department: "Administration",
  });

  const lecturer1 = await User.create({
    fullName: "Dr. Sarah Johnson",
    email: "lecturer@demo.com",
    password: hashedPassword,
    role: "lecturer",
    department: "Computer Science",
  });

  const lecturer2 = await User.create({
    fullName: "Prof. Michael Chen",
    email: "lecturer2@demo.com",
    password: hashedPassword,
    role: "lecturer",
    department: "Mathematics",
  });

  const students = await User.insertMany([
    {
      fullName: "Alice Williams",
      email: "student@demo.com",
      password: hashedPassword,
      role: "student",
      matricNumber: "STU/2021/001",
      department: "Computer Science",
    },
    {
      fullName: "Bob Martinez",
      email: "bob@demo.com",
      password: hashedPassword,
      role: "student",
      matricNumber: "STU/2021/002",
      department: "Computer Science",
    },
    {
      fullName: "Carol Davis",
      email: "carol@demo.com",
      password: hashedPassword,
      role: "student",
      matricNumber: "STU/2021/003",
      department: "Mathematics",
    },
    {
      fullName: "David Wilson",
      email: "david@demo.com",
      password: hashedPassword,
      role: "student",
      matricNumber: "STU/2021/004",
      department: "Computer Science",
    },
    {
      fullName: "Emma Brown",
      email: "emma@demo.com",
      password: hashedPassword,
      role: "student",
      matricNumber: "STU/2021/005",
      department: "Mathematics",
    },
  ]);

  // Create courses
  const courses = await Course.insertMany([
    {
      courseCode: "CSC301",
      courseTitle: "Data Structures and Algorithms",
      lecturerId: lecturer1._id,
    },
    {
      courseCode: "CSC401",
      courseTitle: "Database Management Systems",
      lecturerId: lecturer1._id,
    },
    {
      courseCode: "MTH201",
      courseTitle: "Calculus and Linear Algebra",
      lecturerId: lecturer2._id,
    },
    {
      courseCode: "CSC201",
      courseTitle: "Object Oriented Programming",
      lecturerId: lecturer1._id,
    },
  ]);

  // Enroll students
  const enrollments = [];
  for (const student of students) {
    for (const course of courses.slice(0, 2)) {
      enrollments.push({ studentId: student._id, courseId: course._id });
    }
  }
  await Enrollment.insertMany(enrollments, { ordered: false }).catch(() => {});

  console.log("\n✅ Seed completed successfully!\n");
  console.log("Demo Accounts:");
  console.log("  Admin:    admin@demo.com    / password123");
  console.log("  Lecturer: lecturer@demo.com / password123");
  console.log("  Student:  student@demo.com  / password123\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
