import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { geminiFlash } from "@/lib/gemini";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import { subDays, format } from "date-fns";
import { decrypt } from "@/lib/crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mode-specific prompt templates — real instruction blocks, not generic strings
const MODE_TEMPLATES: Record<string, string> = {
  expand: `You are expanding a simple list of daily activities into a natural journal entry.

The user will list their day's activities in order (like: wake up, work, lunch, movie, sleep).
Your job is to write it out as a simple, flowing paragraph that follows the same order.

Rules:
- Keep the exact same order of activities as given
- Use very simple everyday words only
- Write like someone noting down what they did that day
- Do not add activities that are not mentioned
- Do not make it fancy or emotional
- Keep it short and direct
- Based on the mood emoji, adjust the feeling slightly (happy mood = positive tone, sad mood = flat tone, neutral mood = plain tone)
- Length should match the number of activities (each activity = 1-2 simple sentences)

Example:
Input: "wake up, coffee, meeting, lunch, gym, dinner, sleep"
Output: "Woke up and had coffee. Went to a meeting. Had lunch. Went to the gym. Had dinner and went to sleep."

Just write what happened in plain words.`,

  rewrite: `Rewrite this list of activities into a cleaner simple paragraph.
Keep the exact same order. Use basic everyday words only.
Make it flow better but stay very simple.
Do not add anything new. Keep same length.`,

  summarize: `Summarize the day's activities in 2-3 very short simple sentences.
Capture only the main things done. Use plain everyday words.
No extra details.`,

  insights: `Look at this list of daily activities and give simple insights.
You MUST respond in this exact JSON format (no markdown, no code blocks):
{
  "mood": "Simple sentence about how the day seems based on activities",
  "patterns": "One simple pattern noticed in 1 short sentence",
  "suggestions": "One simple easy suggestion in 1 short sentence"
}
Use only basic words. Keep each field under 10 words if possible.`,
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  reflective: "Use simple words. Write like you are just noting down what happened.",
  motivational: "Use simple positive words. Keep it light and easy.",
  analytical: "Use plain simple words. Just state what happened clearly.",
  concise: "Use very few words. Be brief and simple.",
  storytelling: "Use simple words. Tell what happened in order like a short story.",
};

function smartTruncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.substring(0, maxLen);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('!'),
    truncated.lastIndexOf('?')
  );
  if (lastSentenceEnd > maxLen * 0.7) return truncated.substring(0, lastSentenceEnd + 1);
  return truncated + "...";
}

function getModel(userKey?: string) {
  if (userKey) {
    const decrypted = decrypt(userKey);
    if (decrypted) {
      const genAI = new GoogleGenerativeAI(decrypted);
      return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    }
  }
  return geminiFlash;
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { rawNotes, wentWell, drained, tomorrow, mood, tone = "reflective", mode = "expand" } = body;

    // Edge case: block if input too short
    const combinedInput = [rawNotes, wentWell, drained, tomorrow].filter(Boolean).join(" ");
    if (combinedInput.length < 20) {
      return NextResponse.json({ success: false, error: "Write at least 20 characters before using AI" }, { status: 400 });
    }

    // Fetch user's AI settings
    await connectDB();
    const user = await User.findById(session.user.id).select("aiSettings").lean();
    const userStyle = user?.aiSettings?.style || "";
    const userKey = user?.aiSettings?.geminiKey || "";

    // Determine which model to use (only user key allowed)
    if (!userKey) {
      return NextResponse.json({
        success: false,
        error: "Personal API Key required. Please go to Settings → AI & Journal and add your Gemini API Key to use this feature."
      }, { status: 400 });
    }
    const model = getModel(userKey);

    // Fetch last 3 days of journal entries for context
    const today = new Date();
    const threeDaysAgo = subDays(today, 3);
    const recentEntries = await JournalEntry.find({
      userId: session.user.id,
      date: { $gte: threeDaysAgo, $lt: today },
    }).sort({ date: -1 }).limit(3).select("rawNotes mood date").lean();

    const historyContext = recentEntries.length > 0
      ? recentEntries.map((e: any) =>
        `[${format(new Date(e.date), "MMM d")}] Mood: ${e.mood}/5 — ${smartTruncate(e.rawNotes || "", 200)}`
      ).join("\n")
      : "";

    // Build the prompt with mood emoji instruction
    const moodEmojiMap: Record<number, string> = {
      1: "very sad/tired",
      2: "somewhat down",
      3: "neutral/okay",
      4: "good/happy",
      5: "great/energetic"
    };

    const moodDescription = moodEmojiMap[mood] || "neutral/okay";

    const modeTemplate = MODE_TEMPLATES[mode] || MODE_TEMPLATES.expand;
    const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.reflective;

    const prompt = `${modeTemplate}

${toneInstruction}

Important: The user's mood today is ${moodDescription}. Use this to slightly adjust the feeling of the writing.

${userStyle ? `User prefers: "${userStyle}"` : ""}

--- USER'S ACTIVITY LIST (keep this exact order) ---
${smartTruncate(rawNotes || "None", 2500)}
${wentWell ? `Good things: ${smartTruncate(wentWell, 500)}` : ""}
${drained ? `Hard things: ${smartTruncate(drained, 500)}` : ""}
${tomorrow ? `Tomorrow plan: ${smartTruncate(tomorrow, 500)}` : ""}
Mood level: ${mood || 3}/5

${historyContext ? `--- LAST FEW DAYS ---\n${historyContext}` : ""}

${mode === "insights" ? "Respond ONLY with valid JSON. No markdown." : "Write only the journal entry. No extra words. Follow the exact order of activities."}
Write simply. Sound like a person noting their day.`;

    const result = await model.generateContent(prompt);
    const output = result.response.text().trim();

    // For insights mode, parse structured JSON
    if (mode === "insights") {
      try {
        // Strip markdown code blocks if Gemini wraps them
        const cleaned = output.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleaned);
        return NextResponse.json({ success: true, text: output, insights: parsed });
      } catch {
        // Fallback: return raw text if JSON parsing fails
        return NextResponse.json({ success: true, text: output, insights: null });
      }
    }

    return NextResponse.json({ success: true, text: output });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}