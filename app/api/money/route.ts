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
import { startOfDay, addDays, subDays, format, isAfter } from "date-fns";

// ─── Shared: compute totals from entries ───────────────────────
function computeTotals(entries: Array<{ type: string; paymentMode: string; amount: number }>) {
  let totalSpentCash = 0;
  let totalSpentUPI = 0;
  let totalSpentCard = 0;
  let totalSpentBank = 0;
  let totalIncome = 0;
  let totalExpenses = 0;
  let incomeCash = 0;
  let incomeUPI = 0;

  for (const e of entries) {
    if (e.type === "expense") {
      totalExpenses += e.amount;
      if (e.paymentMode === "cash") totalSpentCash += e.amount;
      else if (e.paymentMode === "upi") totalSpentUPI += e.amount;
      else if (e.paymentMode === "card") totalSpentCard += e.amount;
      else if (e.paymentMode === "bank") totalSpentBank += e.amount;
    } else {
      totalIncome += e.amount;
      if (e.paymentMode === "cash") incomeCash += e.amount;
      else if (e.paymentMode === "upi") incomeUPI += e.amount;
    }
  }

  return {
    totalSpentCash, totalSpentUPI, totalSpentCard, totalSpentBank,
    totalIncome, totalExpenses,
    incomeCash, incomeUPI,
    net: totalIncome - totalExpenses,
  };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date") || format(new Date(), "yyyy-MM-dd");
    const targetDate = startOfDay(new Date(dateParam));
    const nextDay = addDays(targetDate, 1);

    await connectDB();

    // Fetch entries for this date
    const entries = await MoneyEntry.find({
      userId: session.user.id,
      date: { $gte: targetDate, $lt: nextDay },
    }).sort({ date: -1 }).lean();

    // Fetch or carry-forward day balance
    let dayBalance = await DayBalance.findOne({
      userId: session.user.id,
      date: { $gte: targetDate, $lt: nextDay },
    }).lean() as any;

    let carryForward = false;

    if (!dayBalance) {
      // Try carry-forward from previous day
      const prevDate = subDays(targetDate, 1);
      const prevNextDay = targetDate;
      const prevBalance = await DayBalance.findOne({
        userId: session.user.id,
        date: { $gte: prevDate, $lt: prevNextDay },
      }).lean() as any;

      if (prevBalance) {
        // Get previous day entries to compute expected
        const prevEntries = await MoneyEntry.find({
          userId: session.user.id,
          date: { $gte: prevDate, $lt: prevNextDay },
        }).lean();

        const prevTotals = computeTotals(prevEntries as Array<{ type: string; paymentMode: string; amount: number }>);
        const prevOpeningCash = (prevBalance.openingCash as number) || 0;
        const prevOpeningUPI = (prevBalance.openingUPI as number) || 0;
        const prevExpectedCash = prevOpeningCash - prevTotals.totalSpentCash + prevTotals.incomeCash;
        const prevExpectedUPI = prevOpeningUPI - prevTotals.totalSpentUPI + prevTotals.incomeUPI;

        // Prefer actual closing over expected
        const openingCash = (prevBalance.closingCashActual as number | null) ?? prevExpectedCash;
        const openingUPI = (prevBalance.closingUPIActual as number | null) ?? prevExpectedUPI;

        // Auto-create today's balance with carry-forward
        dayBalance = await DayBalance.findOneAndUpdate(
          { userId: session.user.id, date: { $gte: targetDate, $lt: nextDay } },
          {
            $setOnInsert: {
              userId: session.user.id,
              date: targetDate,
              openingCash,
              openingUPI,
              closingCashActual: null,
              closingUPIActual: null,
              carryForward: true,
            },
          },
          { upsert: true, new: true }
        ).lean() as any;
        carryForward = true;
      }
    } else {
      carryForward = (dayBalance.carryForward as boolean) || false;
    }

    // Compute totals dynamically
    const totals = computeTotals(entries as Array<{ type: string; paymentMode: string; amount: number }>);

    // Compute expected closing & mismatch dynamically
    const openingCash = (dayBalance?.openingCash as number) || 0;
    const openingUPI = (dayBalance?.openingUPI as number) || 0;
    const expectedCash = openingCash - totals.totalSpentCash + totals.incomeCash;
    const expectedUPI = openingUPI - totals.totalSpentUPI + totals.incomeUPI;
    const closingCashActual = (dayBalance?.closingCashActual as number | null) ?? null;
    const closingUPIActual = (dayBalance?.closingUPIActual as number | null) ?? null;
    const mismatchCash = closingCashActual !== null ? closingCashActual - expectedCash : null;
    const mismatchUPI = closingUPIActual !== null ? closingUPIActual - expectedUPI : null;

    // Budget status for the month
    const month = format(targetDate, "yyyy-MM");
    const budgets = await Budget.find({ userId: session.user.id, month }).lean();
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const monthEntries = await MoneyEntry.find({
      userId: session.user.id,
      type: "expense",
      date: { $gte: monthStart, $lt: nextDay },
    }).lean();

    const todaysBudgetStatus = budgets.map((b: any) => {
      const spent = (monthEntries as Array<{ category: string; amount: number }>)
        .filter((e) => e.category === b.category)
        .reduce((s, e) => s + e.amount, 0);
      const budget = (b.amount as number) || 0;
      const remaining = budget - spent;
      const percentUsed = budget > 0 ? (spent / budget) * 100 : 0;
      return {
        category: b.category as string,
        budget,
        spent,
        remaining,
        percentUsed,
        overspent: spent > budget,
      };
    });

    // Recurring templates
    const recurringTemplates = await RecurringExpense.find({
      userId: session.user.id,
      active: true,
    }).lean();

    return NextResponse.json({
      success: true,
      data: {
        entries,
        dayBalance: dayBalance
          ? {
              openingCash,
              openingUPI,
              closingCashActual,
              closingUPIActual,
              carryForward,
              note: (dayBalance.note as string) || "",
              tallyNote: (dayBalance.tallyNote as string) || "",
            }
          : null,
        computed: {
          expectedCash,
          expectedUPI,
          mismatchCash,
          mismatchUPI,
          totalSpentCash: totals.totalSpentCash,
          totalSpentUPI: totals.totalSpentUPI,
          totalSpentCard: totals.totalSpentCard,
          totalSpentBank: totals.totalSpentBank,
          totalIncome: totals.totalIncome,
          totalExpenses: totals.totalExpenses,
          net: totals.net,
        },
        todaysBudgetStatus,
        recurringTemplates,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

const createEntrySchema = z.object({
  amount: z.number().positive("Amount must be positive").max(10_000_000, "Amount too large"),
  type: z.enum(["expense", "income"]),
  paymentMode: z.enum(["cash", "upi", "card", "bank"]),
  category: z.string().min(1).max(50),
  subcategory: z.string().max(50).optional(),
  note: z.string().max(200).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  isRecurring: z.boolean().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createEntrySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    // Validate date is not in the future
    const entryDate = parsed.data.date ? new Date(parsed.data.date) : new Date();
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    if (isAfter(startOfDay(entryDate), today)) {
      return NextResponse.json({ success: false, error: "Cannot add entries for future dates" }, { status: 400 });
    }

    await connectDB();

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
