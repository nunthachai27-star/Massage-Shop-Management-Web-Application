import { buildRoster, RosterDuty, RosterTherapist } from "./cleaning-roster";

const T = (...ids: number[]): RosterTherapist[] => ids.map((id) => ({ id }));
const duty = (
  id: number,
  required_count: number,
  sort_order: number,
): RosterDuty => ({
  id,
  required_count,
  sort_order,
});

describe("buildRoster", () => {
  it("distributes one duty evenly across weeks (each therapist once over 5 weeks)", () => {
    const weeks = [
      "2026-06-22",
      "2026-06-29",
      "2026-07-06",
      "2026-07-13",
      "2026-07-20",
    ];
    const result = buildRoster(T(1, 2, 3, 4, 5), [duty(10, 1, 1)], weeks);
    expect(result).toHaveLength(5);
    const counts = new Map<number, number>();
    for (const a of result)
      counts.set(a.therapist_id, (counts.get(a.therapist_id) || 0) + 1);
    expect([...counts.values()]).toEqual([1, 1, 1, 1, 1]);
  });

  it("never assigns the same therapist two duties in one week", () => {
    const result = buildRoster(
      T(1, 2, 3),
      [duty(10, 2, 1), duty(20, 1, 2)],
      ["2026-06-22"],
    );
    const ids = result.map((a) => a.therapist_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(result).toHaveLength(3);
  });

  it("avoids giving a therapist the same duty on consecutive weeks", () => {
    const result = buildRoster(
      T(1, 2),
      [duty(10, 1, 1), duty(20, 1, 2)],
      ["2026-06-22", "2026-06-29"],
    );
    // Week 1: dutyA(10)->t1, dutyB(20)->t2. Week 2: dutyA should go to t2.
    const wk2 = result.filter((a) => a.week_start === "2026-06-29");
    const a10 = wk2.find((a) => a.duty_id === 10);
    const a20 = wk2.find((a) => a.duty_id === 20);
    expect(a10?.therapist_id).toBe(2);
    expect(a20?.therapist_id).toBe(1);
  });

  it("fills only what it can when therapists are fewer than slots", () => {
    const result = buildRoster(T(1), [duty(10, 2, 1)], ["2026-06-22"]);
    expect(result).toHaveLength(1);
  });

  it("respects prevAssignments at the boundary week", () => {
    const prev = [{ week_start: "2026-06-15", duty_id: 10, therapist_id: 1 }];
    const result = buildRoster(T(1, 2), [duty(10, 1, 1)], ["2026-06-22"], prev);
    // t1 had duty 10 last week, so t2 should get it this week.
    expect(result[0].therapist_id).toBe(2);
  });
});
