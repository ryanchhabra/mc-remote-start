import { NextResponse } from "next/server";
import { setStatus, type ServerState } from "@/lib/store";

function isAuthorized(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${process.env.AGENT_API_KEY}`;
}

const VALID_STATES: ServerState[] = ["offline", "starting", "online", "stopping", "error"];

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !VALID_STATES.includes(body.state)) {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }

  setStatus(body.state, body.detail ?? "", {
    playersOnline: typeof body.playersOnline === "number" ? body.playersOnline : null,
    playersMax: typeof body.playersMax === "number" ? body.playersMax : null,
    version: typeof body.version === "string" ? body.version : null,
    uptimeSeconds: typeof body.uptimeSeconds === "number" ? body.uptimeSeconds : null,
  });
  return NextResponse.json({ ok: true });
}
