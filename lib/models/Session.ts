import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface SessionDocument extends Document {
  courseId: Types.ObjectId;
  lecturerId: Types.ObjectId;
  token: string;
  qrCode: string;
  startsAt: Date;
  expiresAt: Date;
  geoFence?: { lat: number; lng: number; radius: number };
  active: boolean;
  createdAt: Date;
}

const SessionSchema = new Schema<SessionDocument>(
  {
    courseId: { type: Schema.Types.ObjectId, ref: "Course", required: true },
    lecturerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    qrCode: { type: String, required: true },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    geoFence: {
      lat: Number,
      lng: Number,
      radius: Number,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

SessionSchema.index({ courseId: 1, active: 1 });

const Session: Model<SessionDocument> =
  mongoose.models.Session ?? mongoose.model<SessionDocument>("Session", SessionSchema);

export default Session;
