import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { queueStopAndShutdownCommand } from "@/lib/store";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  queueStopAndShutdownCommand();
  return NextResponse.json({ ok: true });
}
