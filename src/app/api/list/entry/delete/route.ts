import { type NextRequest, NextResponse } from "next/server";
import { requestAniList } from "@/lib/anilist/client";
import { aniListEndpoints } from "@/lib/anilist/endpoints";
import { DeleteListEntryMutation } from "@/lib/anilist/queries";
import { isSameOrigin } from "@/lib/auth/request-checks";
import { authorizedInit, noStore, notLoggedIn, personalRequestFailed, readSession } from "@/lib/auth/server";
import { parseDeleteEntry } from "@/lib/entry-input";

/** Removes one list entry, after the user confirmed in the page (ADR-0004). */
export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers.get("origin"), request.url)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: noStore });
  }
  const session = await readSession();
  if (!session) return notLoggedIn();
  const id = parseDeleteEntry(await request.json().catch(() => null));
  if (!id) return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });

  try {
    const { data } = await requestAniList(DeleteListEntryMutation, { id }, authorizedInit(session.token), aniListEndpoints().api);
    return NextResponse.json({ deleted: Boolean(data.DeleteMediaListEntry?.deleted) }, { headers: noStore });
  } catch (error) {
    return personalRequestFailed(error);
  }
}
