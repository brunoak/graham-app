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
    "fixed_income", // Renda Fixa BR
    "fixed_income_us", // Renda Fixa EUA
    "treasure",   // Tesouro Direto
    "fund",       // Fundos de Investimento
    "fiagro",     // FI Agro
    "fund_exempt", // Fundos Isentos
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
    average_price: z.number().nonnegative("Average Price must be positive"), // Preço Médio
    currency: z.enum(["BRL", "USD"]).default("BRL"),
    last_update: z.date().optional(),
    updated_at: z.date().optional(),
    // Optional: Current Price (mocked or fetched)
    price: z.number().optional()
})

export type Asset = z.infer<typeof assetSchema>

/**
 * Schema for Market Quote (Price).
 * Represents the current market status of an asset.
 */
export const quoteSchema = z.object({
    ticker: z.string().toUpperCase(),
    price: z.number(),
    change_percent: z.number(), // Daily variation %
    updated_at: z.date(),
})

export type Quote = z.infer<typeof quoteSchema>

/**
 * Schema for Investment Transaction (Buy/Sell).
 */
export const investmentTransactionSchema = z.object({
    id: z.string().uuid().optional(),
    asset_id: z.string().uuid().optional(), // Relation to Asset
    ticker: z.string().toUpperCase(),
    type: z.enum(["buy", "sell", "dividend"]),
    date: z.date(),
    quantity: z.number().positive(),
    price: z.number().positive(), // Unit price at transaction
    fees: z.number().min(0).optional().default(0), // Brokerage fees
    total: z.number().positive(), // Calculated (qty * price + fees)
})

export type InvestmentTransaction = z.infer<typeof investmentTransactionSchema>
