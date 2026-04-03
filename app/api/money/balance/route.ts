import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import DayBalance from "@/models/DayBalance";
import { startOfDay, addDays } from "date-fns";
import { z } from "zod";

const balanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  openingCash: z.number().min(0).max(10_000_000).optional(),
  openingUPI: z.number().min(0).max(10_000_000).optional(),
  closingCashActual: z.number().min(0).max(10_000_000).nullable().optional(),
  closingUPIActual: z.number().min(0).max(10_000_000).nullable().optional(),
  note: z.string().max(200).optional(),
  tallyNote: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const date = startOfDay(new Date(dateParam));

    await connectDB();
    const balance = await DayBalance.findOne({
      userId: session.user.id,
      date: { $gte: date, $lt: addDays(date, 1) },
    }).lean();

    return NextResponse.json({ success: true, data: balance });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = balanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    const date = startOfDay(new Date(parsed.data.date));
    await connectDB();

    // If setting actual closing, verify opening exists first
    if (parsed.data.closingCashActual !== undefined || parsed.data.closingUPIActual !== undefined) {
      const existing = await DayBalance.findOne({
        userId: session.user.id,
        date: { $gte: date, $lt: addDays(date, 1) },
      }).lean() as Record<string, unknown> | null;

      if (!existing) {
        return NextResponse.json(
          { success: false, error: "Set opening balance before entering actual closing" },
          { status: 400 }
        );
      }
    }

    // Build update object — only include fields that were actually sent
    const updateFields: Record<string, unknown> = {
      userId: session.user.id,
      date,
    };
    if (parsed.data.openingCash !== undefined) updateFields.openingCash = parsed.data.openingCash;
    if (parsed.data.openingUPI !== undefined) updateFields.openingUPI = parsed.data.openingUPI;
    if (parsed.data.closingCashActual !== undefined) updateFields.closingCashActual = parsed.data.closingCashActual;
    if (parsed.data.closingUPIActual !== undefined) updateFields.closingUPIActual = parsed.data.closingUPIActual;
    if (parsed.data.note !== undefined) updateFields.note = parsed.data.note;
    if (parsed.data.tallyNote !== undefined) updateFields.tallyNote = parsed.data.tallyNote;

    const balance = await DayBalance.findOneAndUpdate(
      { userId: session.user.id, date: { $gte: date, $lt: addDays(date, 1) } },
      { $set: updateFields },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: balance });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
