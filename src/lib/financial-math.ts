/**
 * Formats a number as a currency string.
 * @param value - The numeric value to format.
 * @param currency - The currency code (default: 'BRL').
 * @param locale - The locale to use (default: 'pt-BR').
 */
export function formatCurrency(value: number, currency: "BRL" | "USD" = "BRL", locale = "pt-BR"): string {
    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
    }).format(value)
}

/**
 * Calculates the percentage growth between an initial and current value.
 * Safe against division by zero (returns 0).
 * @param current - Current value.
 * @param initial - Initial value (basis).
 * @returns Growth percentage as a number (e.g., 0.15 for 15%).
 */
export function calculateGrowth(current: number, initial: number): number {
    if (initial === 0) return 0
    return (current - initial) / initial
}

/**
 * Formats a decimal number as a percentage string.
 * @param value - The decimal value (e.g. 0.15).
 * @param decimals - Number of decimal places (default: 1).
 */
export function formatPercentage(value: number, decimals = 1): string {
    return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Calculates the total value of an asset position.
 * @param quantity - Number of shares/units.
 * @param price - Price per unit.
 */
export function calculatePositionTotal(quantity: number, price: number): number {
    return quantity * price
}
