import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import MoneyEntry from "@/models/MoneyEntry";
import mongoose from "mongoose";
import { z } from "zod";
import { startOfDay, addDays, differenceInDays, format } from "date-fns";
import { MONEY_CATEGORIES } from "@/lib/constants";

const reportSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parsed = reportSchema.safeParse({
      from: searchParams.get("from"),
      to: searchParams.get("to"),
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    });

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
    }

    const fromDate = startOfDay(new Date(parsed.data.from));
    const toDate = addDays(startOfDay(new Date(parsed.data.to)), 1); // inclusive end
    const days = differenceInDays(toDate, fromDate);
    const userId = new mongoose.Types.ObjectId(session.user.id);
    const page = parsed.data.page;
    const limit = parsed.data.limit;
    const skip = (page - 1) * limit;

    await connectDB();

    // ─── Summary totals ────────────────────────────────────────
    const summaryResult = await MoneyEntry.aggregate([
      { $match: { userId, date: { $gte: fromDate, $lt: toDate } } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const expenseAgg = summaryResult.find((r) => r._id === "expense");
    const incomeAgg = summaryResult.find((r) => r._id === "income");
    const totalExpenses = expenseAgg?.total || 0;
    const totalIncome = incomeAgg?.total || 0;
    const net = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0;

    // ─── By Category (expenses) ────────────────────────────────
    const byCategoryRaw = await MoneyEntry.aggregate([
      { $match: { userId, type: "expense", date: { $gte: fromDate, $lt: toDate } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const byCategory = byCategoryRaw.map((r) => {
      const cat = MONEY_CATEGORIES.find(
        (c) => c.id === r._id?.toLowerCase() || c.label.toLowerCase() === r._id?.toLowerCase()
      );
      return {
        id: cat?.id || r._id,
        label: cat?.label || r._id,
        icon: cat?.icon || "Package",
        color: cat?.color || "#6b7280",
        amount: r.total,
        count: r.count,
        percentage: totalExpenses > 0 ? (r.total / totalExpenses) * 100 : 0,
      };
    });

    // ─── By Payment Mode ───────────────────────────────────────
    const byPaymentModeRaw = await MoneyEntry.aggregate([
      { $match: { userId, type: "expense", date: { $gte: fromDate, $lt: toDate } } },
      {
        $group: {
          _id: "$paymentMode",
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const byPaymentMode = byPaymentModeRaw.map((r) => ({
      mode: r._id,
      amount: r.total,
      count: r.count,
      percentage: totalExpenses > 0 ? (r.total / totalExpenses) * 100 : 0,
    }));

    // ─── By Day ────────────────────────────────────────────────
    const byDayRaw = await MoneyEntry.aggregate([
      { $match: { userId, date: { $gte: fromDate, $lt: toDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            type: "$type",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.date": 1 } },
    ]);

    // Build day map
    const dayMap: Record<string, { income: number; expenses: number }> = {};
    for (const r of byDayRaw) {
      const dateKey = r._id.date;
      if (!dayMap[dateKey]) dayMap[dateKey] = { income: 0, expenses: 0 };
      if (r._id.type === "income") dayMap[dateKey].income = r.total;
      else dayMap[dateKey].expenses = r.total;
    }

    const byDay = Object.entries(dayMap)
      .map(([date, vals]) => ({
        date,
        income: vals.income,
        expenses: vals.expenses,
        net: vals.income - vals.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── Income by Category ────────────────────────────────────
    const incomeByCatRaw = await MoneyEntry.aggregate([
      { $match: { userId, type: "income", date: { $gte: fromDate, $lt: toDate } } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const incomeByCategory = incomeByCatRaw.map((r) => ({
      category: r._id,
      amount: r.total,
      percentage: totalIncome > 0 ? (r.total / totalIncome) * 100 : 0,
    }));

    // ─── Paginated Transactions ────────────────────────────────
    const totalTransactions = await MoneyEntry.countDocuments({
      userId: session.user.id,
      date: { $gte: fromDate, $lt: toDate },
    });

    const transactions = await MoneyEntry.find({
      userId: session.user.id,
      date: { $gte: fromDate, $lt: toDate },
    })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // ─── Insights ──────────────────────────────────────────────
    const insights: string[] = [];

    if (totalExpenses > 0 && byCategory.length > 0) {
      const topCat = byCategory[0];
      insights.push(
        `Your biggest expense category is ${topCat.label} at ₹${topCat.amount.toFixed(2)} (${topCat.percentage.toFixed(0)}% of total)`
      );
    }

    if (totalIncome > 0 && incomeByCategory.length > 0) {
      insights.push(
        `Your biggest income source is ${incomeByCategory[0].category} (${incomeByCategory[0].percentage.toFixed(0)}%)`
      );
    }

    if (byDay.length > 0) {
      const highestDay = byDay.reduce((max, d) => d.expenses > max.expenses ? d : max, byDay[0]);
      if (highestDay.expenses > 0) {
        insights.push(
          `Your highest spending day was ${highestDay.date} with ₹${highestDay.expenses.toFixed(2)}`
        );
      }
    }

    if (totalIncome > 0) {
      insights.push(`You saved ${savingsRate.toFixed(0)}% of your income this period`);
    }

    if (byDay.length > 1) {
      const avgSpend = totalExpenses / byDay.length;
      insights.push(`Your average daily spending is ₹${avgSpend.toFixed(2)}`);
    }

    return NextResponse.json({
      success: true,
      data: {
        period: { from: parsed.data.from, to: parsed.data.to, days },
        summary: { totalIncome, totalExpenses, net, savingsRate },
        byCategory,
        byPaymentMode,
        byDay,
        incomeByCategory,
        transactions,
        totalTransactions,
        insights,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
