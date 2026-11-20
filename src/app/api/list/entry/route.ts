import { type NextRequest, NextResponse } from "next/server";
import { requestAniList } from "@/lib/anilist/client";
import { aniListEndpoints } from "@/lib/anilist/endpoints";
import { SaveListEntryMutation } from "@/lib/anilist/queries";
import { isSameOrigin } from "@/lib/auth/request-checks";
import { authorizedInit, noStore, notLoggedIn, personalRequestFailed, readSession } from "@/lib/auth/server";
import { parseSaveEntry } from "@/lib/entry-input";

/** Adds or changes one list entry: one SaveMediaListEntry per action (ADR-0004). */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }
  const session = await readSession();
  if (!session) return notLoggedIn();
  const variables = parseSaveEntry(await request.json().catch(() => null));
  if (!variables) return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });

  try {
    const { data } = await requestAniList(
      SaveListEntryMutation,
      variables,
      authorizedInit(session.token),
      aniListEndpoints().api,
    );
    return NextResponse.json(data.SaveMediaListEntry, { headers: noStore });
  } catch (error) {
    return personalRequestFailed(error);
  }
}
