import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import JournalEntry from "@/models/JournalEntry";
import { geminiFlash } from "@/lib/gemini";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    if (!process.env.GEMINI_API_KEY) {
       return NextResponse.json({ success: false, error: "Missing Gemini Configuration" }, { status: 500 });
    }

    await connectDB();

    const recentJournals = await JournalEntry.find({ userId: session.user.id })
      .sort({ date: -1 })
      .limit(5)
      .lean();
    
    const journalText = recentJournals.map(j => j.expandedContent || j.rawNotes).join("\n---\n");

    const prompt = `
    Based on the following 5 recent journal entries from the user, suggest exactly 3 actionable, structured Goals that would improve their well-being, mitigate their struggles, or support their intentions.

    Journal Entries:
    ${journalText || 'The user has not written much yet. Suggest 3 general foundational life goals for a fresh start.'}

    Return ONLY a highly structured JSON array of 3 goal objects. No markdown formatting, no preamble, strictly raw JSON.
    Format each object exactly like this:
    [
      {
         "title": "Inspiring goal name",
         "description": "Why this matters based on journal",
         "category": "personal",
         "milestones": [
           { "title": "Specific action step", "order": 1 }
         ]
      }
    ]
    `;

    const result = await geminiFlash.generateContent(prompt);
    let jsonText = result.response.text().trim();
    if(jsonText.startsWith("```json")) jsonText = jsonText.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsedGoals = JSON.parse(jsonText);

    return NextResponse.json({ success: true, data: parsedGoals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
