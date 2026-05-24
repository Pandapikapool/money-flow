import { describe, it, expect } from 'vitest';
import { mondayOf } from './goals.repo';

// Pure function — no DB needed. The pg Pool import in goals.repo doesn't
// open a connection until a query is issued, so it's safe to import here.

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

describe('mondayOf (IST-aware week bucketing)', () => {
    it('returns the Monday of the same week given a midweek input', () => {
        // Wed 2026-05-20 16:00 UTC -> Wed 2026-05-20 21:30 IST
        // -> Monday of that IST week is May 18
        const wed = new Date('2026-05-20T16:00:00Z');
        expect(isoDate(mondayOf(wed))).toBe('2026-05-18');
    });

    it('regression: Sun-in-UTC but Mon-in-IST stays on the new week', () => {
        // Sun 2026-05-24 19:00 UTC = Mon 2026-05-25 00:30 IST
        // Naive UTC mondayOf would bucket this into the prior week (May 18).
        // IST-aware mondayOf must return May 25.
        const istMonEarly = new Date('2026-05-24T19:00:00Z');
        expect(isoDate(mondayOf(istMonEarly))).toBe('2026-05-25');
    });

    it('keeps a true Sunday on the previous week', () => {
        // Sun 2026-05-24 09:00 UTC = Sun 2026-05-24 14:30 IST -> prior Monday May 18
        const sun = new Date('2026-05-24T09:00:00Z');
        expect(isoDate(mondayOf(sun))).toBe('2026-05-18');
    });

    it('handles input that is already Monday morning IST', () => {
        // Mon 2026-05-25 06:00 IST = 00:30 UTC -> Monday May 25
        const mon = new Date('2026-05-25T00:30:00Z');
        expect(isoDate(mondayOf(mon))).toBe('2026-05-25');
    });

    it('rolls across month boundaries', () => {
        // Thu 2026-04-30 12:00 UTC = 17:30 IST -> Monday of that week is Apr 27
        const thu = new Date('2026-04-30T12:00:00Z');
        expect(isoDate(mondayOf(thu))).toBe('2026-04-27');
    });
});
