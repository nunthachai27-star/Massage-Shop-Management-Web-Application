export interface RosterTherapist {
  id: number;
}

export interface RosterDuty {
  id: number;
  required_count: number;
  sort_order: number;
}

export interface RosterAssignment {
  week_start: string;
  duty_id: number;
  therapist_id: number;
}

// Deterministic, fair rotation:
//  - spread total load evenly (pick least-loaded therapist first)
//  - never give one therapist two duties in the same week
//  - avoid repeating the same duty a therapist had the previous week
//  - stable tie-break by therapist id (no randomness → testable)
export function buildRoster(
  therapists: RosterTherapist[],
  duties: RosterDuty[],
  weekStarts: string[],
  prevAssignments: RosterAssignment[] = [],
): RosterAssignment[] {
  const sortedDuties = [...duties].sort(
    (a, b) => a.sort_order - b.sort_order || a.id - b.id,
  );
  const load = new Map<number, number>();
  for (const t of therapists) load.set(t.id, 0);

  // Seed "duty done last week" from the most recent previous week, if any.
  let prevWeekDuty = lastWeekDutyMap(prevAssignments);

  const result: RosterAssignment[] = [];

  for (const week of weekStarts) {
    const assignedThisWeek = new Set<number>();
    const thisWeekDuty = new Map<number, Set<number>>();

    for (const d of sortedDuties) {
      for (let slot = 0; slot < d.required_count; slot++) {
        const candidates = therapists.filter((t) => !assignedThisWeek.has(t.id));
        if (candidates.length === 0) break;

        candidates.sort((a, b) => {
          const la = load.get(a.id) ?? 0;
          const lb = load.get(b.id) ?? 0;
          if (la !== lb) return la - lb; // fairness: least loaded first
          const ra = prevWeekDuty.get(a.id)?.has(d.id) ? 1 : 0;
          const rb = prevWeekDuty.get(b.id)?.has(d.id) ? 1 : 0;
          if (ra !== rb) return ra - rb; // avoid repeating same duty
          return a.id - b.id; // deterministic tie-break
        });

        const chosen = candidates[0];
        result.push({ week_start: week, duty_id: d.id, therapist_id: chosen.id });
        load.set(chosen.id, (load.get(chosen.id) ?? 0) + 1);
        assignedThisWeek.add(chosen.id);
        if (!thisWeekDuty.has(chosen.id)) thisWeekDuty.set(chosen.id, new Set());
        thisWeekDuty.get(chosen.id)!.add(d.id);
      }
    }

    prevWeekDuty = thisWeekDuty;
  }

  return result;
}

function lastWeekDutyMap(prev: RosterAssignment[]): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  if (prev.length === 0) return map;
  const latest = prev.reduce(
    (m, a) => (a.week_start > m ? a.week_start : m),
    prev[0].week_start,
  );
  for (const a of prev) {
    if (a.week_start !== latest) continue;
    if (!map.has(a.therapist_id)) map.set(a.therapist_id, new Set());
    map.get(a.therapist_id)!.add(a.duty_id);
  }
  return map;
}
