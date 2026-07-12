import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStatus } from "@/lib/store";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(getStatus());
}
