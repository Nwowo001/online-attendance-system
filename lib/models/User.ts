import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { Role } from "@/types";

export interface UserDocument extends Document {
  fullName: string;
  email: string;
  password: string;
  matricNumber?: string;
  department?: string;
  role: Role;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<UserDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 6, select: false },
    matricNumber: { type: String, sparse: true, trim: true },
    department: { type: String, trim: true },
    role: {
      type: String,
      enum: ["admin", "lecturer", "student"],
      default: "student",
    },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

UserSchema.methods.comparePassword = async function (
  candidate: string,
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

const User: Model<UserDocument> =
  (mongoose.models.User as Model<UserDocument>) ??
  mongoose.model<UserDocument>("User", UserSchema);

export default User;
