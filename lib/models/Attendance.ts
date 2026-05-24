import mongoose, { Schema, Document, Model, Types } from "mongoose";
import "./Session";
import "./User";
export interface AttendanceDocument extends Document {
  sessionId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: "present" | "late" | "excused";
  checkedInAt: Date;
  deviceInfo?: string;
  ipAddress?: string;
  geoLocation?: { lat: number; lng: number };
}

const AttendanceSchema = new Schema<AttendanceDocument>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "Session", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["present", "late", "excused"],
      default: "present",
    },
    checkedInAt: { type: Date, default: Date.now },
    deviceInfo: String,
    ipAddress: String,
    geoLocation: { lat: Number, lng: Number },
  },
  { timestamps: true },
);

AttendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
AttendanceSchema.index({ studentId: 1 });

const Attendance: Model<AttendanceDocument> =
  mongoose.models.Attendance ??
  mongoose.model<AttendanceDocument>("Attendance", AttendanceSchema);

export default Attendance;
