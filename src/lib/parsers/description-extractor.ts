/**
 * @fileoverview Transaction Description Extractor
 * 
 * Extracts structured data from bank transaction descriptions.
 * Separates payment method from beneficiary/merchant name.
 * 
 * Example:
 * Input: "Transferência enviada pelo Pix - GROWTH SUPPLEMENTS - 10.832.644/0001-58"
 * Output: {
 *   name: "GROWTH SUPPLEMENTS",
 *   paymentMethod: "Pix enviado",
 *   fullDescription: <original>
 * }
 * 
 * @module parsers/description-extractor
 */

/**
 * Extracted transaction data.
 */
export interface ExtractedData {
    /** Merchant/beneficiary name (e.g., "ELETROPAULO", "Mizael Moura") */
    name: string
    /** Payment method (e.g., "Pix enviado", "Boleto", "Cartão de crédito") */
    paymentMethod: string
    /** Original full description */
    fullDescription: string
}

/**
 * Payment method patterns and their normalized names.
 */
const PAYMENT_METHOD_PATTERNS: { pattern: RegExp; method: string }[] = [
    // PIX
    { pattern: /transfer[êe]ncia enviada pelo pix/i, method: 'Pix enviado' },
    { pattern: /transfer[êe]ncia recebida pelo pix/i, method: 'Pix recebido' },
    { pattern: /transfer[êe]ncia enviada/i, method: 'Transferência enviada' },
    { pattern: /transfer[êe]ncia recebida/i, method: 'Transferência recebida' },
    { pattern: /pix enviado/i, method: 'Pix enviado' },
    { pattern: /pix recebido/i, method: 'Pix recebido' },
    { pattern: /pix/i, method: 'Pix' },

    // Boleto
    { pattern: /pagamento de boleto efetuado/i, method: 'Boleto' },
    { pattern: /pagamento.*boleto/i, method: 'Boleto' },
    { pattern: /boleto/i, method: 'Boleto' },

    // TED/DOC
    { pattern: /ted enviada/i, method: 'TED enviada' },
    { pattern: /ted recebida/i, method: 'TED recebida' },
    { pattern: /ted/i, method: 'TED' },
    { pattern: /doc/i, method: 'DOC' },

    // Cartão
    { pattern: /cart[ãa]o de cr[ée]dito/i, method: 'Cartão de crédito' },
    { pattern: /cart[ãa]o de d[ée]bito/i, method: 'Cartão de débito' },
    { pattern: /compra no d[ée]bito/i, method: 'Cartão de débito' },
    { pattern: /compra no cr[ée]dito/i, method: 'Cartão de crédito' },
    { pattern: /d[ée]bito/i, method: 'Débito' },
    { pattern: /cr[ée]dito/i, method: 'Crédito' },

    // Outros
    { pattern: /saque/i, method: 'Saque' },
    { pattern: /dep[óo]sito/i, method: 'Depósito' },
    { pattern: /dividendo/i, method: 'Dividendos' },
    { pattern: /juros/i, method: 'Juros' },
    { pattern: /tarifa/i, method: 'Tarifa' },
]

/**
 * Extracts payment method from transaction description.
 */
function extractPaymentMethod(description: string): string {
    for (const { pattern, method } of PAYMENT_METHOD_PATTERNS) {
        if (pattern.test(description)) {
            return method
        }
    }
    return 'Outros'
}

/**
 * Extracts the beneficiary/merchant name from transaction description.
 * 
 * Handles patterns like:
 * - "Transferência enviada pelo Pix - GROWTH SUPPLEMENTS - 10.832.644/0001-58"
 *   → "GROWTH SUPPLEMENTS"
 * - "Pagamento de boleto efetuado - ELETROPAULO METROPOLITANA"
 *   → "ELETROPAULO METROPOLITANA"
 * - "Transferência Recebida - Natalia Martins Carvalho - •••.457.868-•• - NU P"
 *   → "Natalia Martins Carvalho"
 */
function extractName(description: string): string {
    // Remove leading/trailing whitespace
    let text = description.trim()

    // Pattern 1: Split by " - " and get the second part
    const parts = text.split(/\s*-\s*/)

    if (parts.length >= 2) {
        // The name is usually the second part (after the action type)
        let namePart = parts[1].trim()

        // Clean up: remove CNPJ/CPF patterns
        namePart = namePart.replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '') // CNPJ
        namePart = namePart.replace(/•+\.\d{3}\.\d{3}-•+/g, '') // Masked CPF
        namePart = namePart.replace(/\d{2}\.\d{3}\.\d{3}-\d{2}/g, '') // Full CPF
        namePart = namePart.replace(/•+/g, '') // Bullet points

        // Remove trailing separators and whitespace
        namePart = namePart.replace(/\s*-\s*$/, '').trim()

        // If name is too long (more than 40 chars), truncate at word boundary
        if (namePart.length > 40) {
            namePart = namePart.substring(0, 40).replace(/\s+\S*$/, '').trim()
        }

        if (namePart.length > 2) {
            return namePart
        }
    }

    // Pattern 2: Simple description without " - ", use as is (for CSV fatura)
    // E.g., "Tennessee Sacoma", "Promofarma"
    if (!text.includes(' - ')) {
        // Remove any CNPJ/CPF at the end
        text = text.replace(/\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}.*$/, '')
        text = text.replace(/\s*\d{2}\.\d{3}\.\d{3}-\d{2}.*$/, '')

        if (text.length > 40) {
            text = text.substring(0, 40).replace(/\s+\S*$/, '').trim()
        }

        return text.trim()
    }

    // Fallback: return first 40 chars
    return description.substring(0, 40).trim()
}

/**
 * Extracts structured data from a transaction description.
 * 
 * @param description - The full bank transaction description
 * @param sourceType - Optional: 'fatura' for credit card, 'extrato' for bank statement
 * @returns ExtractedData with name, paymentMethod, and fullDescription
 * 
 * @example
 * const data = extractTransactionData("Transferência enviada pelo Pix - GROWTH SUPPLEMENTS - 10.832.644/0001-58")
 * // Returns:
 * // { name: "GROWTH SUPPLEMENTS", paymentMethod: "Pix enviado", fullDescription: "..." }
 */
export function extractTransactionData(description: string, sourceType?: 'fatura' | 'extrato'): ExtractedData {
    let paymentMethod = extractPaymentMethod(description)

    // For fatura (credit card), if no specific method detected, default to 'Cartão de crédito'
    if (paymentMethod === 'Outros' && sourceType === 'fatura') {
        paymentMethod = 'Cartão de crédito'
    }

    return {
        name: extractName(description),
        paymentMethod: paymentMethod,
        fullDescription: description,
    }
}

/**
 * Batch extraction for multiple descriptions.
 */
export function extractTransactionDataBatch(descriptions: string[]): ExtractedData[] {
    return descriptions.map(d => extractTransactionData(d))
}
