import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { geminiFlash } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { rawNotes, wentWell, drained, tomorrow, mood } = body;

    if (!process.env.GEMINI_API_KEY) {
       return NextResponse.json({ success: false, error: "Missing Gemini Configuration" }, { status: 500 });
    }

    const prompt = `
    You are a personal journaling assistant. The user wrote these raw notes:

    Raw notes: ${rawNotes || 'None'}
    What went well: ${wentWell || 'None'}
    What drained energy: ${drained || 'None'}
    Tomorrow's intention: ${tomorrow || 'None'}
    Mood: ${mood || 3}/5

    Write a warm, reflective, first-person journal entry (300–500 words) that:
    1. Expands the raw notes into flowing prose
    2. Weaves in the reflections naturally
    3. Ends with a forward-looking paragraph based on tomorrow's intention
    4. Maintains the user's voice — casual, honest, personal
    5. Do NOT add fictional details. Only elaborate on what was provided.

    Return only the journal entry text, no preamble or explanation.
    `;

    const result = await geminiFlash.generateContent(prompt);
    const expandedText = result.response.text();

    return NextResponse.json({ success: true, text: expandedText.trim() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
