import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { sendPasswordResetEmail } from "@/lib/nodemailer";
import { z } from "zod";

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = forgotSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.message },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email: result.data.email.toLowerCase() });

    if (user) {
      const resetToken = crypto.randomUUID();
      user.resetToken = resetToken;
      user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();
      
      try {
        await sendPasswordResetEmail(user.email, resetToken);
      } catch (e) {
        console.warn("Failed to dispatch recovery email", e);
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({ success: true, data: { message: "If that email exists, a reset link was sent." } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
