import { z } from "zod"

/**
 * Enum for Asset Types.
 * Defines the categorization of investment assets.
 */
export const assetTypeEnum = z.enum([
    "stock_br",   // Ações Brasil
    "stock_us",   // Ações EUA
    "reit_br",    // FIIs
    "reit_us",    // REITs
    "etf_br",     // ETFs Brasil
    "etf_us",     // ETFs EUA
    "crypto",     // Criptomoedas
    "fixed_income", // Renda Fixa
    "treasure",   // Tesouro Direto
    "cash"        // Caixa / Conta Corrente
])

export type AssetType = z.infer<typeof assetTypeEnum>

/**
 * Schema for an Investment Asset (Portfolio Position).
 * Represents a user's holding in a specific asset.
 */
export const assetSchema = z.object({
    id: z.string().uuid().optional(), // Database ID
    ticker: z.string().min(1, "Ticker is required").toUpperCase(),
    name: z.string().optional(), // Full company name
    type: assetTypeEnum,
    quantity: z.number().nonnegative("Quantity must be positive"),
    averagePrice: z.number().nonnegative("Average Price must be positive"), // Preço Médio
    currency: z.enum(["BRL", "USD"]).default("BRL"),
    lastUpdate: z.date().optional(),
})

export type Asset = z.infer<typeof assetSchema>

/**
 * Schema for Market Quote (Price).
 * Represents the current market status of an asset.
 */
export const quoteSchema = z.object({
    ticker: z.string().toUpperCase(),
    price: z.number(),
    changePercent: z.number(), // Daily variation %
    updatedAt: z.date(),
})

export type Quote = z.infer<typeof quoteSchema>

/**
 * Schema for Investment Transaction (Buy/Sell).
 */
export const investmentTransactionSchema = z.object({
    id: z.string().uuid().optional(),
    assetId: z.string().uuid().optional(), // Relation to Asset
    ticker: z.string().toUpperCase(),
    type: z.enum(["buy", "sell"]),
    date: z.date(),
    quantity: z.number().positive(),
    price: z.number().positive(), // Unit price at transaction
    fees: z.number().min(0).optional().default(0), // Brokerage fees
    total: z.number().positive(), // Calculated (qty * price + fees)
})

export type InvestmentTransaction = z.infer<typeof investmentTransactionSchema>
