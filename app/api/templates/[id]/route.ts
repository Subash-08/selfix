import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Template } from "@/models/Template";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const unwrappedParams = await params;
    const id = unwrappedParams.id;

    await connectDB();
    await Template.deleteOne({ _id: id, userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
