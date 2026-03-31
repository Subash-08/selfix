import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MoneyEntry from "@/models/MoneyEntry";
import DayBalance from "@/models/DayBalance";
import Budget from "@/models/Budget";
import RecurringExpense from "@/models/RecurringExpense";
import { updateStreak } from "@/lib/streakService";
import { z } from "zod";
import { startOfDay, addDays, format } from "date-fns";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
    const targetDate = startOfDay(new Date(dateParam));
    const nextDay = addDays(targetDate, 1);

    await connectDB();

    const entries = await MoneyEntry.find({
      userId: session.user.id,
      date: { $gte: targetDate, $lt: nextDay },
    }).sort({ date: -1 }).lean();

    const dayBalance = await DayBalance.findOne({
      userId: session.user.id,
      date: { $gte: targetDate, $lt: nextDay },
    }).lean() as any;

    // Compute closing amounts
    const totalSpentCash = entries.filter((e: any) => e.type === "expense" && e.paymentMode === "cash").reduce((s: number, e: any) => s + e.amount, 0);
    const totalSpentUPI = entries.filter((e: any) => e.type === "expense" && e.paymentMode === "upi").reduce((s: number, e: any) => s + e.amount, 0);
    const totalSpentCard = entries.filter((e: any) => e.type === "expense" && e.paymentMode === "card").reduce((s: number, e: any) => s + e.amount, 0);
    const totalIncome = entries.filter((e: any) => e.type === "income").reduce((s: number, e: any) => s + e.amount, 0);

    const openingCash = dayBalance?.openingCash || 0;
    const openingUPI = dayBalance?.openingUPI || 0;
    const cashClosing = openingCash - totalSpentCash + totalIncome;
    const upiClosing = openingUPI - totalSpentUPI;
    const closingCashActual = dayBalance?.closingCashActual || 0;
    const tally = closingCashActual > 0 ? closingCashActual - cashClosing : 0;

    // Budget status
    const month = format(targetDate, "yyyy-MM");
    const budgets = await Budget.find({ userId: session.user.id, month }).lean();
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEntries = await MoneyEntry.find({
      userId: session.user.id,
      type: "expense",
      date: { $gte: monthStart, $lt: nextDay },
    }).lean();

    const todaysBudgetStatus = budgets.map((b: any) => {
      const spent = monthEntries.filter((e: any) => e.category === b.category).reduce((s: number, e: any) => s + e.amount, 0);
      return {
        category: b.category,
        budget: b.amount,
        spent,
        remaining: b.amount - spent,
        overspent: spent > b.amount,
      };
    });

    // Recurring templates
    const recurringTemplates = await RecurringExpense.find({ userId: session.user.id, active: true }).lean();

    return NextResponse.json({
      success: true,
      data: {
        entries,
        dayBalance,
        computedClosing: { cashClosing, upiClosing, totalSpentCash, totalSpentUPI, totalSpentCard, totalIncome, tally },
        recurringTemplates,
        todaysBudgetStatus,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const schema = z.object({
      amount: z.number().positive(),
      type: z.enum(["expense", "income"]),
      paymentMode: z.enum(["cash", "upi", "card", "bank"]).default("cash"),
      category: z.string().min(1),
      subcategory: z.string().optional(),
      note: z.string().optional(),
      date: z.string().optional(),
      isRecurring: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    await connectDB();

    const entryDate = parsed.data.date ? new Date(parsed.data.date) : new Date();

    const entry = await MoneyEntry.create({
      userId: session.user.id,
      amount: parsed.data.amount,
      type: parsed.data.type,
      paymentMode: parsed.data.paymentMode,
      category: parsed.data.category,
      subcategory: parsed.data.subcategory,
      note: parsed.data.note,
      date: entryDate,
      isRecurring: parsed.data.isRecurring || false,
      tags: parsed.data.tags || [],
    });

    await updateStreak(session.user.id, "money");

    return NextResponse.json({ success: true, data: entry });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
