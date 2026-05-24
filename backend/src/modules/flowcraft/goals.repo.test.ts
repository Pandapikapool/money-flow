import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the pg pool module so evaluateGoal can be exercised without a
// live database. vi.mock is hoisted above all imports automatically.
vi.mock("../../core/db", () => ({
    pool: {
        query: vi.fn(),
    },
}));

import { pool } from "../../core/db";
import { mondayOf, evaluateGoal, type Goal } from "./goals.repo";

const mockedQuery = vi.mocked(pool.query);

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

// === mondayOf (pure function, mock not used) ===========================

describe("mondayOf (IST-aware week bucketing)", () => {
    it("returns the Monday of the same week given a midweek input", () => {
        // Wed 2026-05-20 16:00 UTC -> Wed 2026-05-20 21:30 IST
        // -> Monday of that IST week is May 18
        const wed = new Date("2026-05-20T16:00:00Z");
        expect(isoDate(mondayOf(wed))).toBe("2026-05-18");
    });

    it("regression: Sun-in-UTC but Mon-in-IST stays on the new week", () => {
        // Sun 2026-05-24 19:00 UTC = Mon 2026-05-25 00:30 IST
        // Naive UTC mondayOf would bucket this into the prior week (May 18).
        // IST-aware mondayOf must return May 25.
        const istMonEarly = new Date("2026-05-24T19:00:00Z");
        expect(isoDate(mondayOf(istMonEarly))).toBe("2026-05-25");
    });

    it("keeps a true Sunday on the previous week", () => {
        // Sun 2026-05-24 09:00 UTC = Sun 2026-05-24 14:30 IST -> prior Monday May 18
        const sun = new Date("2026-05-24T09:00:00Z");
        expect(isoDate(mondayOf(sun))).toBe("2026-05-18");
    });

    it("handles input that is already Monday morning IST", () => {
        // Mon 2026-05-25 06:00 IST = 00:30 UTC -> Monday May 25
        const mon = new Date("2026-05-25T00:30:00Z");
        expect(isoDate(mondayOf(mon))).toBe("2026-05-25");
    });

    it("rolls across month boundaries", () => {
        // Thu 2026-04-30 12:00 UTC = 17:30 IST -> Monday of that week is Apr 27
        const thu = new Date("2026-04-30T12:00:00Z");
        expect(isoDate(mondayOf(thu))).toBe("2026-04-27");
    });
});

// === evaluateGoal (cap-category state transitions, pool mocked) =======

function makeCapGoal(overrides: Partial<Goal> = {}): Goal {
    return {
        id: 1,
        user_id: "default",
        kind: "cap-category",
        target_tag_id: 5,
        target_amount: 1500,
        target_count: null,
        week_of: "2026-05-18",
        status: "active",
        bonus_applied: false,
        created_at: "2026-05-18T00:00:00Z",
        completed_at: null,
        ...overrides,
    };
}

describe("evaluateGoal: cap-category state transitions", () => {
    beforeEach(() => mockedQuery.mockReset());

    it("mid-week with spend below cap is not held and not missed", async () => {
        mockedQuery
            .mockResolvedValueOnce({ rows: [{ name: "Fuel" }] } as any)
            .mockResolvedValueOnce({ rows: [{ total: "820" }] } as any);

        const wed = new Date("2026-05-20T12:00:00Z");
        const p = await evaluateGoal(makeCapGoal(), wed);

        expect(p.held).toBe(false);
        expect(p.missed).toBe(false);
        expect(p.numerator).toBe(820);
        expect(p.denominator).toBe(1500);
        expect(p.headline).toBe("Fuel under ₹1,500 this week");
    });

    it("any-time spend above cap is missed (mid-week)", async () => {
        mockedQuery
            .mockResolvedValueOnce({ rows: [{ name: "Fuel" }] } as any)
            .mockResolvedValueOnce({ rows: [{ total: "1800" }] } as any);

        const wed = new Date("2026-05-20T12:00:00Z");
        const p = await evaluateGoal(makeCapGoal(), wed);

        expect(p.held).toBe(false);
        expect(p.missed).toBe(true);
    });

    it("week-over with spend at-or-below cap transitions to held", async () => {
        mockedQuery
            .mockResolvedValueOnce({ rows: [{ name: "Fuel" }] } as any)
            .mockResolvedValueOnce({ rows: [{ total: "1200" }] } as any);

        // Following Monday — week_of is May 18, so May 26 is past Sun May 24
        const nextMon = new Date("2026-05-26T12:00:00Z");
        const p = await evaluateGoal(makeCapGoal(), nextMon);

        expect(p.held).toBe(true);
        expect(p.missed).toBe(false);
    });

    it("null target_tag_id short-circuits with no DB calls", async () => {
        const p = await evaluateGoal(makeCapGoal({ target_tag_id: null }));

        expect(p.held).toBe(false);
        expect(p.missed).toBe(false);
        expect(p.display).toBe("category no longer exists");
        expect(p.headline).toBe("goal needs a category");
        expect(mockedQuery).not.toHaveBeenCalled();
    });

    it("null target_tag_id short-circuits also for skip-category", async () => {
        const p = await evaluateGoal(
            makeCapGoal({ kind: "skip-category", target_tag_id: null, target_amount: null })
        );

        expect(p.held).toBe(false);
        expect(mockedQuery).not.toHaveBeenCalled();
    });
});
