import { NextResponse } from "next/server";
import { consumePendingCommand } from "@/lib/store";

function isAuthorized(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${process.env.AGENT_API_KEY}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ command: consumePendingCommand() });
}
