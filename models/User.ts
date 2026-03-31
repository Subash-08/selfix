import mongoose, { Schema, Model } from "mongoose";
import { IUser } from "@/types";

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    password: { type: String },
    avatar: { type: String },
    provider: { type: String, enum: ["credentials", "google"], default: "credentials" },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    timezone: { type: String, default: "Asia/Kolkata" },
    locale: { type: String, default: "en-IN" },
    currency: { type: String, default: "INR" },
    weekStartsOn: { type: Number, default: 1 },
    emailVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
    verificationTokenExpiry: { type: Date },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models?.User || mongoose.model<IUser>("User", userSchema);
export default User;
