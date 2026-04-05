import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const user = await User.findById(session.user.id).select("-password -verificationToken -verificationTokenExpiry -resetToken -resetTokenExpiry").lean();
    if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    // Mask the gemini key — never send the full key to the frontend
    const safeUser = { ...user } as any;
    if (safeUser.aiSettings?.geminiKey) {
      safeUser.aiSettings = {
        ...safeUser.aiSettings,
        geminiKey: "••••••••" + safeUser.aiSettings.geminiKey.slice(-8),
        hasKey: true,
      };
    } else {
      if (safeUser.aiSettings) {
        safeUser.aiSettings.hasKey = false;
      }
    }

    return NextResponse.json({ success: true, data: safeUser });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await connectDB();

    const allowedFields = ["name", "avatar", "timezone", "locale", "currency", "weekStartsOn", "healthDefaults", "aiSettings"];
    const update: Record<string, any> = {};
    
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === "aiSettings") {
          const settings = { ...body[key] };
          
          // FIX: Check if user is trying to save a new key
          if (settings.geminiKey) {
            // If it's the masked placeholder, keep the existing key
            if (settings.geminiKey.startsWith("••••")) {
              const existingUser = await User.findById(session.user.id).select("aiSettings").lean();
              settings.geminiKey = existingUser?.aiSettings?.geminiKey || "";
            } else {
              // NEW KEY: Encrypt it
              settings.geminiKey = encrypt(settings.geminiKey);
            }
          }
          
          update[key] = settings;
        } else {
          update[key] = body[key];
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      session.user.id, 
      { $set: update }, 
      { new: true, runValidators: true } // Added runValidators
    ).select("-password -verificationToken -verificationTokenExpiry -resetToken -resetTokenExpiry").lean();

    return NextResponse.json({ success: true, data: user });
  } catch (error: any) {
    console.error("Profile update error:", error); // Debug logging
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
