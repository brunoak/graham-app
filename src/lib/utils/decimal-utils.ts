/**
 * @fileoverview Decimal precision utilities for financial calculations
 * @module utils/decimal-utils
 * 
 * Provides safe decimal operations to avoid floating point precision issues
 * in JavaScript. For example: 6.609999999999999 vs 6.61 should be treated as equal.
 */

/**
 * Default decimal places for quantity (fractional shares support)
 */
export const QUANTITY_DECIMALS = 6

/**
 * Default decimal places for prices (2 for BRL/USD)
 */
export const PRICE_DECIMALS = 2

/**
 * Default decimal places for currency amounts
 */
export const CURRENCY_DECIMALS = 2

/**
 * Rounds a number to specified decimal places.
 * Uses Math.round to avoid floating point accumulation errors.
 * 
 * @param value - The number to round
 * @param decimals - Number of decimal places (default: 6)
 * @returns Rounded number
 * 
 * @example
 * roundDecimal(6.609999999999999, 2) // 6.61
 * roundDecimal(0.1 + 0.2, 2) // 0.3
 */
export function roundDecimal(value: number, decimals: number = QUANTITY_DECIMALS): number {
    const multiplier = Math.pow(10, decimals)
    return Math.round(value * multiplier) / multiplier
}

/**
 * Rounds a quantity value (6 decimal places for fractional shares).
 * 
 * @param qty - Quantity to round
 * @returns Rounded quantity
 */
export function roundQuantity(qty: number): number {
    return roundDecimal(qty, QUANTITY_DECIMALS)
}

/**
 * Rounds a price value (2 decimal places).
 * 
 * @param price - Price to round
 * @returns Rounded price
 */
export function roundPrice(price: number): number {
    return roundDecimal(price, PRICE_DECIMALS)
}

/**
 * Rounds a currency amount (2 decimal places).
 * Same as roundPrice but more semantic.
 * 
 * @param amount - Currency amount to round
 * @returns Rounded amount
 */
export function roundCurrency(amount: number): number {
    return roundDecimal(amount, CURRENCY_DECIMALS)
}

/**
 * Compares if a < b with precision tolerance.
 * 
 * @param a - First number
 * @param b - Second number
 * @param decimals - Decimal places for comparison (default: 6)
 * @returns true if a is less than b
 * 
 * @example
 * isLessThan(6.609999999999999, 6.61) // false (they're equal within precision)
 * isLessThan(6.60, 6.61) // true
 */
export function isLessThan(a: number, b: number, decimals: number = QUANTITY_DECIMALS): boolean {
    return roundDecimal(a, decimals) < roundDecimal(b, decimals)
}

/**
 * Compares if a > b with precision tolerance.
 * 
 * @param a - First number
 * @param b - Second number
 * @param decimals - Decimal places for comparison (default: 6)
 * @returns true if a is greater than b
 */
export function isGreaterThan(a: number, b: number, decimals: number = QUANTITY_DECIMALS): boolean {
    return roundDecimal(a, decimals) > roundDecimal(b, decimals)
}

/**
 * Compares if a equals b with precision tolerance.
 * 
 * @param a - First number
 * @param b - Second number
 * @param decimals - Decimal places for comparison (default: 6)
 * @returns true if a equals b within precision
 * 
 * @example
 * isEqual(6.609999999999999, 6.61) // true
 * isEqual(0.1 + 0.2, 0.3) // true
 */
export function isEqual(a: number, b: number, decimals: number = QUANTITY_DECIMALS): boolean {
    return roundDecimal(a, decimals) === roundDecimal(b, decimals)
}

/**
 * Compares if a >= b with precision tolerance.
 * 
 * @param a - First number
 * @param b - Second number
 * @param decimals - Decimal places for comparison (default: 6)
 * @returns true if a is greater than or equal to b
 */
export function isGreaterOrEqual(a: number, b: number, decimals: number = QUANTITY_DECIMALS): boolean {
    return !isLessThan(a, b, decimals)
}

/**
 * Compares if a <= b with precision tolerance.
 * 
 * @param a - First number
 * @param b - Second number
 * @param decimals - Decimal places for comparison (default: 6)
 * @returns true if a is less than or equal to b
 */
export function isLessOrEqual(a: number, b: number, decimals: number = QUANTITY_DECIMALS): boolean {
    return !isGreaterThan(a, b, decimals)
}
