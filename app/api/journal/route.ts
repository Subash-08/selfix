import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import JournalEntry from "@/models/JournalEntry";
import { updateStreak } from "@/lib/streakService";
import { startOfDay, addDays } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    await connectDB();

    if (dateParam) {
      // Return entries for specific date
      const date = startOfDay(new Date(dateParam));
      const nextDay = addDays(date, 1);
      const entries = await JournalEntry.find({
        userId: session.user.id,
        date: { $gte: date, $lt: nextDay },
      }).sort({ date: -1 }).lean();
      return NextResponse.json({ success: true, data: entries });
    }

    // Return all entries
    const entries = await JournalEntry.find({ userId: session.user.id })
      .sort({ date: -1 })
      .lean();
    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    await connectDB();

    const entryDate = body.date ? new Date(body.date) : new Date();

    const entry = await JournalEntry.create({
      userId: session.user.id,
      date: entryDate,
      rawNotes: body.rawNotes || "",
      expandedContent: body.expandedContent || "",
      mood: body.mood || 3,
      moodEmoji: body.moodEmoji || "😐",
      gratitude: body.gratitude || [],
      wordCount: (body.expandedContent || body.rawNotes || "").split(/\s+/).length,
      aiGenerated: !!body.expandedContent,
    });

    await updateStreak(session.user.id, "journal");

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
