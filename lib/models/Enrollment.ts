import mongoose, { Schema, Document, Model, Types } from "mongoose";
import "./Course";
import "./User";

export interface EnrollmentDocument extends Document {
  studentId: Types.ObjectId;
  courseId: Types.ObjectId;
}

const EnrollmentSchema = new Schema<EnrollmentDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
  },
  { timestamps: true },
);

EnrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const Enrollment: Model<EnrollmentDocument> =
  mongoose.models.Enrollment ??
  mongoose.model<EnrollmentDocument>("Enrollment", EnrollmentSchema);

export default Enrollment;
