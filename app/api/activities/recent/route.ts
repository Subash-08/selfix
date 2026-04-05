import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import ActivityEntry from "@/models/ActivityEntry";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const recentEntries = await ActivityEntry.find({ userId: session.user.id })
      .sort({ date: -1 })
      .limit(50)
      .select("name")
      .lean();

    const uniqueNames = Array.from(new Set(recentEntries.map((e: any) => e.name))).slice(0, 10);

    return NextResponse.json({ success: true, data: uniqueNames });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
