import { SETTINGS } from "./settings";

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: SETTINGS.CURRENCY_CODE,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
}
