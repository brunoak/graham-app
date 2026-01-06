/**
 * @fileoverview Category Matcher - Automatic categorization of transactions.
 * 
 * Uses keyword matching to suggest categories for imported transactions.
 * Matches against the exact category IDs from the database.
 * 
 * @module parsers/category-matcher
 */

/**
 * Category from database.
 */
export interface DBCategory {
    id: string
    name: string
    type: string
    classification: string
    icon?: string
    color?: string
}

/**
 * Keyword to category ID mapping.
 * Maps keywords from transaction descriptions to category IDs in the database.
 * 
 * IMPORTANT: Keywords are matched as substrings, case-insensitive.
 * Use shorter keywords to match more variations.
/**
 * Keyword to category NAME mapping.
 * Maps keywords from transaction descriptions to category NAMES in the database.
 * 
 * IMPORTANT: Keywords are matched as substrings, case-insensitive.
 * Category names should match the 'name' column in the categories table.
 * 
 * Database category names (from user's Supabase):
 * - Supermercado, Alimentação (Gastos extras), Transporte, Assinaturas Mensais
 * - Celular, Internet, Energia, Água, Aluguel, Condomínio
 * - Saúde, Plano de saúde, Entretenimento mensal, Educação
 * - Escolas (Filhos), Extras (Casa), Liberdade Financeira, Longo prazo
 * - Outros (Necessidades básicas), Outros (lazer), Outros (Renda), Salário
 * - Cartão de Crédito, Compra de roupas, Proventos, Empréstimo, Default
 */
const KEYWORD_TO_CATEGORY_NAME: Record<string, string> = {
    // ============ SUPERMERCADO ============
    'mercado': 'Supermercado',
    'supermercado': 'Supermercado',
    'carrefour': 'Supermercado',
    'pao de acucar': 'Supermercado',
    'atacadao': 'Supermercado',
    'assai': 'Supermercado',
    'sonda': 'Supermercado',
    'hortifruti': 'Supermercado',
    'mercadinho': 'Supermercado',
    'sacolao': 'Supermercado',
    'sacola': 'Supermercado',
    'big ': 'Supermercado',
    'dia ': 'Supermercado',
    'extra ': 'Supermercado',
    'minuto pao': 'Supermercado',
    'hirota': 'Supermercado',
    'mambo': 'Supermercado',
    'swift': 'Supermercado',
    'nova santa': 'Supermercado',

    // ============ ALIMENTAÇÃO (GASTOS EXTRAS) ============
    'ifood': 'Alimentação (Gastos extras)',
    'uber eats': 'Alimentação (Gastos extras)',
    'rappi': 'Alimentação (Gastos extras)',
    'ze delivery': 'Alimentação (Gastos extras)',
    'restaurante': 'Alimentação (Gastos extras)',
    'lanchonete': 'Alimentação (Gastos extras)',
    'pizzaria': 'Alimentação (Gastos extras)',
    'hamburgueria': 'Alimentação (Gastos extras)',
    'mcdonald': 'Alimentação (Gastos extras)',
    'burger king': 'Alimentação (Gastos extras)',
    'subway': 'Alimentação (Gastos extras)',
    'starbucks': 'Alimentação (Gastos extras)',
    'outback': 'Alimentação (Gastos extras)',
    'pastelaria': 'Alimentação (Gastos extras)',
    'pastel': 'Alimentação (Gastos extras)',
    'acai': 'Alimentação (Gastos extras)',
    'acaiformosa': 'Alimentação (Gastos extras)',
    'padaria': 'Alimentação (Gastos extras)',
    'lanche': 'Alimentação (Gastos extras)',
    'pizza': 'Alimentação (Gastos extras)',
    'sushi': 'Alimentação (Gastos extras)',
    'bar ': 'Alimentação (Gastos extras)',
    'boteco': 'Alimentação (Gastos extras)',
    'cafe ': 'Alimentação (Gastos extras)',
    'coffee': 'Alimentação (Gastos extras)',
    'praca heliopolis': 'Alimentação (Gastos extras)',
    'tennessee': 'Alimentação (Gastos extras)',
    'growth supplement': 'Alimentação (Gastos extras)',

    // ============ TRANSPORTE ============
    'uber': 'Transporte',
    '99 ': 'Transporte',
    '99app': 'Transporte',
    'cabify': 'Transporte',
    'taxi': 'Transporte',
    'combustivel': 'Transporte',
    'gasolina': 'Transporte',
    'posto': 'Transporte',
    'shell': 'Transporte',
    'ipiranga': 'Transporte',
    'pedagio': 'Transporte',
    'sem parar': 'Transporte',
    'conectcar': 'Transporte',
    'estacionamento': 'Transporte',
    'metro': 'Transporte',
    'cptm': 'Transporte',
    'bilhete unico': 'Transporte',
    'sptrans': 'Transporte',

    // ============ ASSINATURAS MENSAIS ============
    'netflix': 'Assinaturas Mensais',
    'spotify': 'Assinaturas Mensais',
    'amazon prime': 'Assinaturas Mensais',
    'prime video': 'Assinaturas Mensais',
    'amazon': 'Assinaturas Mensais',
    'disney': 'Assinaturas Mensais',
    'hbo': 'Assinaturas Mensais',
    'max': 'Assinaturas Mensais',
    'globoplay': 'Assinaturas Mensais',
    'youtube': 'Assinaturas Mensais',
    'apple music': 'Assinaturas Mensais',
    'deezer': 'Assinaturas Mensais',
    'paramount': 'Assinaturas Mensais',
    'star+': 'Assinaturas Mensais',
    'crunchyroll': 'Assinaturas Mensais',
    'twitch': 'Assinaturas Mensais',
    'xbox': 'Assinaturas Mensais',
    'playstation': 'Assinaturas Mensais',
    'game pass': 'Assinaturas Mensais',
    'chatgpt': 'Assinaturas Mensais',
    'openai': 'Assinaturas Mensais',

    // ============ CELULAR ============
    'vivo': 'Celular',
    'claro': 'Celular',
    'tim*': 'Celular',
    'tim ': 'Celular',
    'oi ': 'Celular',
    'recarga': 'Celular',
    'recargapay': 'Celular',
    'bilhunico': 'Celular',
    'picpay': 'Celular',
    'totalpass': 'Celular',

    // ============ INTERNET ============
    'internet': 'Internet',
    'net ': 'Internet',
    'vivo fibra': 'Internet',
    'claro net': 'Internet',
    'live tim': 'Internet',

    // ============ ENERGIA ============
    'cpfl': 'Energia',
    'eletropaulo': 'Energia',
    'enel': 'Energia',
    'cemig': 'Energia',
    'copel': 'Energia',
    'celesc': 'Energia',
    'eletro': 'Energia',
    'energia': 'Energia',
    'luz': 'Energia',

    // ============ ÁGUA ============
    'sabesp': 'Água',
    'sanepar': 'Água',
    'copasa': 'Água',
    'agua': 'Água',

    // ============ MORADIA ============
    'aluguel': 'Aluguel',
    'condominio': 'Condomínio',
    'iptu': 'Extras (Casa)',

    // ============ SAÚDE ============
    'farmacia': 'Saúde',
    'drogaria': 'Saúde',
    'droga raia': 'Saúde',
    'drogasil': 'Saúde',
    'pague menos': 'Saúde',
    'ultrafarma': 'Saúde',
    'promofarma': 'Saúde',
    'farma': 'Saúde',
    'hospital': 'Saúde',
    'clinica': 'Saúde',
    'laboratorio': 'Saúde',
    'dentista': 'Saúde',
    'medico': 'Saúde',
    'consulta': 'Saúde',
    'exame': 'Saúde',

    // ============ PLANO DE SAÚDE ============
    'unimed': 'Plano de saúde',
    'amil': 'Plano de saúde',
    'bradesco saude': 'Plano de saúde',
    'sulamerica': 'Plano de saúde',
    'hapvida': 'Plano de saúde',
    'notredame': 'Plano de saúde',

    // ============ ENTRETENIMENTO ============
    'cinema': 'Entretenimento mensal',
    'cinemark': 'Entretenimento mensal',
    'kinoplex': 'Entretenimento mensal',
    'uci': 'Entretenimento mensal',
    'teatro': 'Entretenimento mensal',
    'show': 'Entretenimento mensal',
    'ingresso': 'Entretenimento mensal',
    'sympla': 'Entretenimento mensal',
    'eventim': 'Entretenimento mensal',
    'balada': 'Entretenimento mensal',
    'festa': 'Entretenimento mensal',

    // ============ EDUCAÇÃO ============
    'udemy': 'Educação',
    'alura': 'Educação',
    'rocketseat': 'Educação',
    'coursera': 'Educação',
    'domestika': 'Educação',
    'livro': 'Educação',
    'livraria': 'Educação',
    'saraiva': 'Educação',
    'amazon livros': 'Educação',
    'curso': 'Educação',
    'mensalidade': 'Educação',
    'escola': 'Escolas (Filhos)',
    'faculdade': 'Educação',

    // ============ ROUPAS ============
    'roupa': 'Compra de roupas',
    'renner': 'Compra de roupas',
    'riachuelo': 'Compra de roupas',
    'c&a': 'Compra de roupas',
    'zara': 'Compra de roupas',
    'hering': 'Compra de roupas',
    'marisa': 'Compra de roupas',
    'centauro': 'Compra de roupas',
    'netshoes': 'Compra de roupas',
    'nike': 'Compra de roupas',
    'adidas': 'Compra de roupas',

    // ============ PIX/TRANSFERÊNCIAS - RECEITAS ============
    'pix recebido': 'Outros (Renda)',
    'transferencia recebida': 'Outros (Renda)',
    'ted recebida': 'Outros (Renda)',
    'deposito': 'Outros (Renda)',
    'recebido': 'Outros (Renda)',
    'credito em conta': 'Outros (Renda)',

    // ============ PIX/TRANSFERÊNCIAS - DESPESAS ============
    'pix enviado': 'Outros (Necessidades básicas)',
    'transferencia enviada': 'Outros (Necessidades básicas)',
    'ted enviada': 'Outros (Necessidades básicas)',
    'enviad': 'Outros (Necessidades básicas)',

    // ============ BOLETOS ============
    'boleto': 'Outros (Necessidades básicas)',
    'pagamento de boleto': 'Outros (Necessidades básicas)',

    // ============ SALÁRIO/RENDA ============
    'salario': 'Salário',
    'folha': 'Salário',
    'proventos': 'Proventos',
    'remuneracao': 'Salário',
    'dividendo': 'Proventos',
    'rendimento': 'Proventos',

    // ============ CARTÃO DE CRÉDITO ============
    'fatura': 'Cartão de Crédito',
    'nubank fatura': 'Cartão de Crédito',
    'itaucard': 'Cartão de Crédito',
    'nu pagamentos': 'Cartão de Crédito',

    // ============ INVESTIMENTOS ============
    'banco xp': 'Liberdade Financeira',
    'xp investimentos': 'Liberdade Financeira',
    'rico': 'Liberdade Financeira',
    'clear': 'Liberdade Financeira',
    'btg': 'Liberdade Financeira',
    'avenue': 'Liberdade Financeira',
    'inter invest': 'Liberdade Financeira',

    // ============ EMPRÉSTIMO ============
    'emprestimo': 'Empréstimo',
    'financiamento': 'Empréstimo',
    'parcela': 'Empréstimo',
    'consignado': 'Empréstimo',

    // ============ PET ============
    'pet shop': 'Outros (Necessidades básicas)',
    'pet ': 'Outros (Necessidades básicas)',
    'petlove': 'Outros (Necessidades básicas)',
    'petz': 'Outros (Necessidades básicas)',
    'cobasi': 'Outros (Necessidades básicas)',

    // ============ LAZER/COMPRAS ============
    'shopping': 'Outros (lazer)',
    'loja': 'Outros (Necessidades básicas)',
    'comercio': 'Outros (Necessidades básicas)',
    'presentes': 'Outros (lazer)',
    'magazine': 'Outros (Necessidades básicas)',
    'casas bahia': 'Outros (Necessidades básicas)',
    'americanas': 'Outros (Necessidades básicas)',
    'mercado livre': 'Outros (Necessidades básicas)',
    'shopee': 'Outros (Necessidades básicas)',
    'aliexpress': 'Outros (Necessidades básicas)',
}

/**
 * Normalizes text for comparison (lowercase, remove accents).
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[*]/g, ' ')            // Replace * with space for matching
        .trim()
}

/**
 * Finds the best matching category for a transaction description.
 * Uses substring matching - if any keyword appears anywhere in the description, it matches.
 */
export function matchCategory(
    description: string,
    categories: DBCategory[]
): DBCategory | undefined {
    if (!description || categories.length === 0) {
        return undefined
    }

    const normalizedDesc = normalizeText(description)

    // 1. Try to find keyword matches -> category NAME
    // Sort keywords by length (longer first) to match more specific keywords first
    const sortedKeywords = Object.entries(KEYWORD_TO_CATEGORY_NAME)
        .sort((a, b) => b[0].length - a[0].length)

    for (const [keyword, categoryName] of sortedKeywords) {
        const normalizedKeyword = normalizeText(keyword)

        if (normalizedDesc.includes(normalizedKeyword)) {
            // Find category by normalized NAME (case-insensitive)
            const normalizedCatName = normalizeText(categoryName)
            const matchedCategory = categories.find(c =>
                normalizeText(c.name) === normalizedCatName ||
                normalizeText(c.name).includes(normalizedCatName) ||
                normalizedCatName.includes(normalizeText(c.name))
            )

            if (matchedCategory) {
                console.log(`[Category] ✅ Matched "${description}" -> "${matchedCategory.name}" via keyword "${keyword}"`)
                return matchedCategory
            }
        }
    }

    // 2. Try to match category names directly against description
    for (const category of categories) {
        const normalizedCatName = normalizeText(category.name)

        // Skip very short category names to avoid false positives
        if (normalizedCatName.length < 4) continue

        if (normalizedDesc.includes(normalizedCatName)) {
            console.log(`[Category] ✅ Direct match "${description}" -> "${category.name}"`)
            return category
        }
    }

    // 3. Check for income indicators (transferência recebida)
    if (normalizedDesc.includes('recebid') ||
        normalizedDesc.includes('recebida') ||
        normalizedDesc.includes('credito em conta')) {
        const outrosRenda = categories.find(c => c.id === 'outros_renda')
        if (outrosRenda) {
            console.log(`[Category] ✅ Income match "${description}" -> "${outrosRenda.name}"`)
            return outrosRenda
        }
    }

    // 4. Check for expense indicators (transferência enviada, pix enviado)
    if (normalizedDesc.includes('enviad') ||
        normalizedDesc.includes('pix -') ||
        normalizedDesc.includes('transferencia -')) {
        // Generic transfer out - use default
        const defaultCat = categories.find(c => c.id === 'default')
        if (defaultCat) {
            return defaultCat
        }
    }

    // No match found - return undefined (will show "..." in UI)
    console.log(`[Category] ❌ No match for "${description}"`)
    return undefined
}

/**
 * Bulk categorization of transactions.
 */
export function matchCategories(
    descriptions: string[],
    categories: DBCategory[]
): Map<string, DBCategory | undefined> {
    const results = new Map<string, DBCategory | undefined>()

    for (const desc of descriptions) {
        results.set(desc, matchCategory(desc, categories))
    }

    return results
}

/**
 * Gets the confidence level for a category match.
 */
export function getMatchConfidence(
    description: string,
    category: DBCategory | undefined
): number {
    if (!category) return 0

    const normalizedDesc = normalizeText(description)
    const normalizedName = normalizeText(category.name)

    // Exact name match
    if (normalizedDesc.includes(normalizedName)) {
        return 1.0
    }

    // Keyword match by NAME
    for (const [keyword, catName] of Object.entries(KEYWORD_TO_CATEGORY_NAME)) {
        if (normalizedDesc.includes(normalizeText(keyword)) &&
            normalizeText(category.name).includes(normalizeText(catName))) {
            return 0.9
        }
    }

    // Default category
    if (category.id === 'default') {
        return 0.3
    }

    return 0.5
}

/**
 * Adds custom keywords for a category (for learning).
 */
export function addCustomKeyword(categoryName: string, keyword: string): void {
    const normalizedKeyword = normalizeText(keyword)
    KEYWORD_TO_CATEGORY_NAME[normalizedKeyword] = categoryName
}
