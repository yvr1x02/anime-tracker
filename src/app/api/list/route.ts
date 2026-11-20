import { NextResponse } from "next/server";
import { requestAniList } from "@/lib/anilist/client";
import { aniListEndpoints } from "@/lib/anilist/endpoints";
import { UserAnimeListQuery } from "@/lib/anilist/queries";
import { authorizedInit, noStore, notLoggedIn, personalRequestFailed, readSession } from "@/lib/auth/server";
import { listEntries } from "@/lib/list";

/** The logged-in user's whole list in one AniList request (ADR-0004); the browser keeps it for the session. */
export async function GET() {
  const session = await readSession();
  if (!session) return notLoggedIn();

  try {
    const { data } = await requestAniList(
      UserAnimeListQuery,
      { userId: session.userId },
      authorizedInit(session.token),
      aniListEndpoints().api,
    );
    return NextResponse.json(listEntries(data.MediaListCollection), { headers: noStore });
  } catch (error) {
    return personalRequestFailed(error);
  }
}
