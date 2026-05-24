import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface CourseDocument extends Document {
  courseCode: string;
  courseTitle: string;
  lecturerId: Types.ObjectId;
  createdAt: Date;
}

const CourseSchema = new Schema<CourseDocument>(
  {
    courseCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    courseTitle: { type: String, required: true, trim: true },
    lecturerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

const Course: Model<CourseDocument> =
  mongoose.models.Course ?? mongoose.model<CourseDocument>("Course", CourseSchema);

export default Course;
