import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import Budget from "@/models/Budget";
import { format } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || format(new Date(), "yyyy-MM");

    await connectDB();
    const budgets = await Budget.find({ userId: session.user.id, month }).lean();
    return NextResponse.json({ success: true, data: budgets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const month = body.month || format(new Date(), "yyyy-MM");

    await connectDB();

    const budget = await Budget.findOneAndUpdate(
      { userId: session.user.id, month, category: body.category },
      { $set: { userId: session.user.id, month, category: body.category, amount: body.amount } },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: budget });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
