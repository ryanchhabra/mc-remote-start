import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { queueShutdownCommand } from "@/lib/store";

export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  queueShutdownCommand();
  return NextResponse.json({ ok: true });
}
