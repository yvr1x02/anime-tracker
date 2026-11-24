"use client";

import { ListStats } from "@/components/list-stats";
import { OwnList } from "@/components/my-list";

/** Statistiche for a logged-in user, from the list kept for the session (ADR-0004). */
export function MyStats() {
  return (
    <OwnList
      path="/statistiche"
      placeholder={
        <div aria-hidden="true" className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-24 rounded-panel bg-raised" />
          ))}
        </div>
      }
    >
      {(entries) => <ListStats entries={entries} own />}
    </OwnList>
  );
}
