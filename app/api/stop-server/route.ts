import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { queueStopCommand } from "@/lib/store";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  queueStopCommand();
  return NextResponse.json({ ok: true });
}
