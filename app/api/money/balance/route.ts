import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import DayBalance from "@/models/DayBalance";
import { startOfDay, addDays } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const date = startOfDay(new Date(dateParam));

    await connectDB();
    const balance = await DayBalance.findOne({
      userId: session.user.id,
      date: { $gte: date, $lt: addDays(date, 1) },
    }).lean();

    return NextResponse.json({ success: true, data: balance });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const dateParam = body.date || new Date().toISOString().split("T")[0];
    const date = startOfDay(new Date(dateParam));

    await connectDB();

    const balance = await DayBalance.findOneAndUpdate(
      { userId: session.user.id, date: { $gte: date, $lt: addDays(date, 1) } },
      {
        $set: {
          userId: session.user.id,
          date,
          ...(body.openingCash !== undefined && { openingCash: body.openingCash }),
          ...(body.openingUPI !== undefined && { openingUPI: body.openingUPI }),
          ...(body.closingCashActual !== undefined && { closingCashActual: body.closingCashActual }),
          ...(body.note !== undefined && { note: body.note }),
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: balance });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
