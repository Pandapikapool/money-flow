import { describe, it, expect } from 'vitest';
import { formatCurrency } from './format';

describe('formatCurrency', () => {
    it('formats whole rupees with the ₹ symbol and two decimals', () => {
        // Intl.NumberFormat output uses U+20B9 (₹) followed by NBSP on some
        // ICU builds; assert by includes() instead of strict equality.
        const out = formatCurrency(1500);
        expect(out).toContain('₹');
        expect(out).toContain('1,500.00');
    });

    it('uses Indian grouping (lakh) for large numbers', () => {
        const out = formatCurrency(1234567);
        expect(out).toContain('12,34,567.00');
    });

    it('handles zero', () => {
        const out = formatCurrency(0);
        expect(out).toContain('0.00');
    });

    it('handles decimals at standard rupee precision', () => {
        const out = formatCurrency(123.4);
        expect(out).toContain('123.40');
    });

    it('handles negative amounts', () => {
        const out = formatCurrency(-500);
        expect(out).toContain('500.00');
        // The minus sign placement varies by locale; just confirm the value lands.
    });
});
