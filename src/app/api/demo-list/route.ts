import { NextResponse } from "next/server";
import { readDemoList } from "@/lib/demo-list";

/**
 * The demo profile's public list for Cosa guardo stasera? without login. Public data, no session: the
 * server's fetch cache (1 hour) answers most calls, so AniList sees at most one request an hour.
 */
export async function GET() {
  try {
    const demo = await readDemoList();
    if (!demo) return NextResponse.json({ error: "unavailable" }, { status: 404 });
    return NextResponse.json({ userName: demo.userName, entries: demo.entries });
  } catch (error) {
    console.error(`Demo list failed: ${error instanceof Error ? error.name : "unknown"}`);
    return NextResponse.json({ error: "anilist-unavailable" }, { status: 502 });
  }
}
