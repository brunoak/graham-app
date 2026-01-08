/**
 * PDF Parser Service
 * 
 * Calls the Python microservice to parse brokerage note PDFs.
 * The microservice should be deployed on Railway.
 */

const PDF_PARSER_URL = process.env.NEXT_PUBLIC_PDF_PARSER_API_URL || process.env.PDF_PARSER_API_URL || 'http://localhost:8000'

export interface ParsedOperation {
    ticker: string
    name?: string
    type: 'buy' | 'sell'
    asset_type: string
    quantity: number
    price: number
    total: number
    currency: string
    trade_date?: string
}

export interface ParsedFees {
    brokerage: number
    settlement: number
    emoluments: number
    custody: number
    iss: number
    irrf: number
    other: number
    total: number
}

export interface ParseResult {
    success: boolean
    broker?: string
    note_date?: string
    note_number?: string
    operations: ParsedOperation[]
    fees?: ParsedFees
    net_value?: number
    currency: string
    raw_text?: string
    warnings: string[]
}

export type ParserType = 'br-nota' | 'ibkr' | 'inter-global' | 'avenue' | 'generic'

export interface ParseOptions {
    password?: string
    debug?: boolean
}

/**
 * Parse a brokerage note PDF using the Python microservice.
 * 
 * @param file - The PDF file to parse
 * @param type - The parser type to use
 * @param options - Optional password and debug settings
 * @returns Parsed operations and fees
 */
export async function parseBrokerageNotePDF(
    file: File,
    type: ParserType = 'br-nota',
    options: ParseOptions = {}
): Promise<ParseResult> {
    const formData = new FormData()
    formData.append('file', file)

    // Build URL with query params
    const url = new URL(`${PDF_PARSER_URL}/parse/${type}`)
    if (options.password) {
        url.searchParams.append('password', options.password)
    }
    if (options.debug) {
        url.searchParams.append('debug', 'true')
    }

    try {
        const response = await fetch(url.toString(), {
            method: 'POST',
            body: formData,
        })

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
            throw new Error(error.detail || `HTTP ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error('[PDF Parser] Error:', error)
        throw error
    }
}

/**
 * Check if the PDF parser service is available.
 */
export async function checkPDFParserHealth(): Promise<{
    available: boolean
    parsers: string[]
}> {
    try {
        const response = await fetch(`${PDF_PARSER_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) return { available: false, parsers: [] }

        const data = await response.json()
        return {
            available: data.status === 'ok',
            parsers: data.parsers || []
        }
    } catch {
        return { available: false, parsers: [] }
    }
}

/**
 * Broker definitions for UI selector
 */
export const SUPPORTED_BROKERS = {
    'br-nota': {
        label: 'Notas BR (Rico, XP, Clear, BTG, Nuinvest)',
        description: 'Nota de corretagem brasileira',
        requiresPassword: true,
        passwordHint: 'CPF sem pontos (ex: 12345678901)',
        currency: 'BRL'
    },
    'avenue': {
        label: 'Avenue',
        description: 'Transaction confirmation (US stocks)',
        requiresPassword: false,
        currency: 'USD'
    },
    'inter-global': {
        label: 'Inter Global',
        description: 'Inter Co Securities (US transactions)',
        requiresPassword: false,
        currency: 'USD'
    },
    'ibkr': {
        label: 'Interactive Brokers',
        description: 'Activity Statement (PDF or CSV)',
        requiresPassword: false,
        currency: 'USD'
    },
    'generic': {
        label: 'Outro',
        description: 'Parser genérico (tentativa)',
        requiresPassword: false,
        currency: 'BRL'
    }
} as const

/**
 * Map parser type from file content or user selection.
 */
export function detectParserType(filename: string, broker?: string): ParserType {
    const lowerFilename = filename.toLowerCase()
    const lowerBroker = broker?.toLowerCase() || ''

    // IBKR detection
    if (
        lowerFilename.includes('ibkr') ||
        lowerFilename.includes('interactive') ||
        lowerBroker.includes('interactive')
    ) {
        return 'ibkr'
    }

    // Avenue detection
    if (lowerFilename.includes('avenue') || lowerBroker.includes('avenue')) {
        return 'avenue'
    }

    // Inter Global detection
    if (
        (lowerFilename.includes('inter') && lowerFilename.includes('global')) ||
        lowerFilename.includes('inter co') ||
        lowerBroker.includes('inter global')
    ) {
        return 'inter-global'
    }

    // Brazilian broker detection
    const brBrokers = ['clear', 'xp', 'rico', 'btg', 'nuinvest', 'genial', 'modal', 'agora']
    for (const br of brBrokers) {
        if (lowerFilename.includes(br) || lowerBroker.includes(br)) {
            return 'br-nota'
        }
    }

    // Default to generic
    return 'generic'
}

