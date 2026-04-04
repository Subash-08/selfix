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
  expand: `Expand the following journal into a detailed, emotionally rich reflection.
Preserve the user's voice. Do not add fictional events or details.
Write in first person. Make it feel personal and authentic.
Target: 300–500 words.`,

  rewrite: `Rewrite this journal clearly and coherently while keeping the original meaning.
Remove redundancy. Improve flow. Keep it natural and conversational.
Preserve the user's tone and intent. Do not add new information.
Target: Similar length to the original.`,

  summarize: `Summarize this journal entry concisely.
Capture the key events, emotions, and reflections in 2–4 sentences.
Be clear and direct. No fluff.`,

  insights: `Analyze this journal entry and provide structured insights.
You MUST respond in this exact JSON format (no markdown, no code blocks):
{
  "mood": "A single sentence describing the overall emotional state",
  "patterns": "Key behavioral or emotional patterns observed",
  "suggestions": "1-2 actionable, specific suggestions for improvement"
}
Be concise, honest, and actionable. Do not sugarcoat.`,
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  reflective: "Use a reflective, introspective tone. Focus on emotional clarity and self-awareness.",
  motivational: "Use an uplifting, energizing tone. Highlight strengths and progress. Encourage forward momentum.",
  analytical: "Use a clear, logical tone. Focus on cause-and-effect. Be precise and structured.",
  concise: "Use a minimal, direct tone. Every sentence must earn its place. No filler.",
  storytelling: "Use a narrative tone. Frame the day as a story with a beginning, middle, and looking-ahead ending.",
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

    // Build the prompt
    const modeTemplate = MODE_TEMPLATES[mode] || MODE_TEMPLATES.expand;
    const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.reflective;

    const prompt = `${modeTemplate}

${toneInstruction}

${userStyle ? `User's personal writing style preference: "${userStyle}"` : ""}

--- USER'S JOURNAL INPUT ---
Raw notes: ${smartTruncate(rawNotes || "None", 2500)}
${wentWell ? `What went well: ${smartTruncate(wentWell, 500)}` : ""}
${drained ? `What drained energy: ${smartTruncate(drained, 500)}` : ""}
${tomorrow ? `Tomorrow's intention: ${smartTruncate(tomorrow, 500)}` : ""}
Mood: ${mood || 3}/5

${historyContext ? `--- RECENT CONTEXT (last few days) ---\n${historyContext}` : ""}

${mode === "insights" ? "Respond ONLY with valid JSON. No markdown formatting." : "Return only the journal text, no preamble or explanation."}
Generate a slightly different version each time this is called — vary phrasing and structure.`;

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
