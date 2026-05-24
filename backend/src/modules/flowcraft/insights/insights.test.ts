import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../core/db", () => ({
    pool: { query: vi.fn() },
}));

import { pool } from "../../../core/db";
import { buildFreelyYours } from "./freely-yours";
import { buildUsual } from "./usual";
import { buildWon } from "./won";
import { buildQuietlyBigger } from "./quietly-bigger";

const mockedQuery = vi.mocked(pool.query);

// 2026-05-20 is a Wednesday; May has 31 days, so daysRemaining = 12.
const ctx = { userId: "default", today: new Date("2026-05-20T12:00:00Z") };

describe("buildFreelyYours", () => {
    beforeEach(() => mockedQuery.mockReset());

    it("returns null when no budget is set", async () => {
        mockedQuery.mockResolvedValueOnce({ rows: [] } as any);
        const insight = await buildFreelyYours(ctx);
        expect(insight).toBeNull();
    });

    it("returns null when budget is zero", async () => {
        mockedQuery.mockResolvedValueOnce({ rows: [{ amount: "0" }] } as any);
        const insight = await buildFreelyYours(ctx);
        expect(insight).toBeNull();
    });

    it("returns null when spent meets-or-exceeds budget", async () => {
        mockedQuery
            .mockResolvedValueOnce({ rows: [{ amount: "10000" }] } as any)
            .mockResolvedValueOnce({ rows: [{ total: "12000" }] } as any);
        const insight = await buildFreelyYours(ctx);
        expect(insight).toBeNull();
    });

    it("returns a calm card with the projected weekly safe amount", async () => {
        // budget 30000, spent 10000 -> 20000 remaining; today May 20, 12 days
        // remain -> weeklySafe = (20000/12)*7 ≈ 11667.
        mockedQuery
            .mockResolvedValueOnce({ rows: [{ amount: "30000" }] } as any)
            .mockResolvedValueOnce({ rows: [{ total: "10000" }] } as any);
        const insight = await buildFreelyYours(ctx);
        expect(insight).not.toBeNull();
        expect(insight!.kind).toBe("freely-yours");
        expect(insight!.tone).toBe("calm");
        expect(insight!.title).toBe("Freely yours this week");
        expect(insight!.body).toContain("₹11,667");
    });
});

describe("buildUsual", () => {
    beforeEach(() => mockedQuery.mockReset());

    it("returns null with fewer than 3 weeks of data", async () => {
        mockedQuery.mockResolvedValueOnce({
            rows: [{ total: "1000" }, { total: "1100" }],
        } as any);
        const insight = await buildUsual(ctx);
        expect(insight).toBeNull();
    });

    it("returns null when weekly CV is >= 18%", async () => {
        mockedQuery.mockResolvedValueOnce({
            rows: [
                { total: "1000" },
                { total: "2000" },
                { total: "1500" },
                { total: "500" },
            ],
        } as any);
        const insight = await buildUsual(ctx);
        expect(insight).toBeNull();
    });

    it("returns a calm card when weekly CV is low", async () => {
        mockedQuery.mockResolvedValueOnce({
            rows: [
                { total: "1000" },
                { total: "1050" },
                { total: "980" },
                { total: "1020" },
            ],
        } as any);
        const insight = await buildUsual(ctx);
        expect(insight).not.toBeNull();
        expect(insight!.kind).toBe("usual");
        expect(insight!.tone).toBe("calm");
        expect(insight!.title).toBe("Same as usual");
    });
});

describe("buildWon", () => {
    beforeEach(() => mockedQuery.mockReset());

    it("returns null when no expenses in past 7 days", async () => {
        mockedQuery.mockResolvedValueOnce({ rows: [] } as any);
        const insight = await buildWon(ctx);
        expect(insight).toBeNull();
    });

    it("surfaces a no-spend day when one exists in the past 7 days", async () => {
        // ctx.today = May 20 → window May 14..20. Omit May 16 to make it no-spend.
        mockedQuery.mockResolvedValueOnce({
            rows: [
                { d: "2026-05-14", total: "500" },
                { d: "2026-05-15", total: "300" },
                // 2026-05-16 missing → fills to 0 → noSpendDay
                { d: "2026-05-17", total: "400" },
                { d: "2026-05-18", total: "200" },
                { d: "2026-05-19", total: "350" },
                { d: "2026-05-20", total: "450" },
            ],
        } as any);
        const insight = await buildWon(ctx);
        expect(insight).not.toBeNull();
        expect(insight!.kind).toBe("won");
        expect(insight!.tone).toBe("compassionate");
        expect(insight!.body).toMatch(
            /Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday/,
        );
    });

    it("surfaces a notably-quiet day when no no-spend day exists", async () => {
        // All 7 days have spending; one is notably under the average.
        mockedQuery.mockResolvedValueOnce({
            rows: [
                { d: "2026-05-14", total: "1000" },
                { d: "2026-05-15", total: "1100" },
                { d: "2026-05-16", total: "50" }, // tiny — should be the quiet day
                { d: "2026-05-17", total: "1200" },
                { d: "2026-05-18", total: "900" },
                { d: "2026-05-19", total: "1050" },
                { d: "2026-05-20", total: "1150" },
            ],
        } as any);
        const insight = await buildWon(ctx);
        expect(insight).not.toBeNull();
        expect(insight!.kind).toBe("won");
        // 2026-05-16 was a Saturday
        expect(insight!.body).toContain("Saturday");
    });
});

describe("buildQuietlyBigger", () => {
    beforeEach(() => mockedQuery.mockReset());

    it("returns null when no category trended up", async () => {
        mockedQuery.mockResolvedValueOnce({ rows: [] } as any);
        const insight = await buildQuietlyBigger(ctx);
        expect(insight).toBeNull();
    });

    it("surfaces the category with the biggest absolute uptick", async () => {
        mockedQuery.mockResolvedValueOnce({
            rows: [{ tag: "Fuel", recent: "8000", prior: "4000", pct_change: "100" }],
        } as any);
        const insight = await buildQuietlyBigger(ctx);
        expect(insight).not.toBeNull();
        expect(insight!.kind).toBe("quietly-bigger");
        expect(insight!.tone).toBe("gentle-attention");
        expect(insight!.body).toContain("Fuel");
        expect(insight!.body).toContain("₹8,000");
        expect(insight!.body).toContain("₹4,000");
        expect(insight!.body).toContain("100%");
    });
});
