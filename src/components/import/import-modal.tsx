"use client"

/**
 * @fileoverview Import Modal - Upload and import bank statements/credit card invoices.
 * 
 * Features:
 * - Drag & drop file upload
 * - MANDATORY bank selection with format info
 * - File type validation (extrato vs fatura)
 * - Name + Description + Categoria columns
 * - Manual category selection like dashboard
 * 
 * @module components/import/import-modal
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Upload,
    FileText,
    AlertTriangle,
    CheckCircle2,
    X,
    Loader2,
    ChevronDown,
} from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

import { SUPPORTED_BANKS, BankType, FileSourceType } from '@/lib/parsers/types'
import { CategoryBadge } from '@/components/transactions/category-badge'
import { CategorySelectionDialog } from '@/components/transactions/category-selection-dialog'
import { getCategories } from '@/lib/actions/category-actions'

/**
 * Parsed transaction from API response.
 */
interface ParsedTransaction {
    date: string
    amount: number
    description: string
    /** Extracted merchant/beneficiary name */
    name?: string
    /** Payment method (Pix, Boleto, Cartão, etc) */
    paymentMethod?: string
    type: 'income' | 'expense'
    suggestedCategoryId?: string
    suggestedCategoryName?: string
    suggestedCategoryIcon?: string
    suggestedCategoryColor?: string
    isPossibleDuplicate?: boolean
    duplicateReason?: string
}

interface ImportModalProps {
    /** Callback after successful import */
    onImportComplete?: () => void
    /** Trigger element (default: button) */
    children?: React.ReactNode
}

/**
 * Format support by bank.
 */
const BANK_FORMATS: Record<string, { extrato: string[]; fatura: string[] }> = {
    nubank: { extrato: ['OFX', 'CSV'], fatura: ['OFX', 'CSV'] },
    inter: { extrato: ['CSV'], fatura: ['CSV'] },
    itau: { extrato: ['OFX'], fatura: ['PDF'] },
    bb: { extrato: ['OFX'], fatura: ['PDF'] },
    bradesco: { extrato: ['OFX'], fatura: ['PDF'] },
    santander: { extrato: ['OFX'], fatura: ['PDF'] },
    caixa: { extrato: ['OFX'], fatura: ['PDF'] },
    c6: { extrato: ['OFX'], fatura: ['PDF'] },
    btg: { extrato: ['OFX', 'XLSX'], fatura: ['PDF'] },
    picpay: { extrato: ['CSV'], fatura: ['CSV'] },
    rico: { extrato: ['CSV'], fatura: ['CSV'] },
}

export function ImportModal({ onImportComplete, children }: ImportModalProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'upload' | 'preview'>('upload')
    const [loading, setLoading] = useState(false)

    // Upload state
    const [file, setFile] = useState<File | null>(null)
    const [bank, setBank] = useState<BankType | ''>('')
    const [sourceType, setSourceType] = useState<FileSourceType>('extrato')

    // Validation state - only show errors after user attempts to submit
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false)
    const [validationError, setValidationError] = useState<string | null>(null)

    // Preview state
    const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
    const [selectedTxs, setSelectedTxs] = useState<Set<number>>(new Set())
    const [stats, setStats] = useState({ total: 0, duplicates: 0 })
    const [accountName, setAccountName] = useState('')

    // Categories for manual selection
    const [categories, setCategories] = useState<any[]>([])

    // Load categories when modal opens
    useEffect(() => {
        if (open) {
            loadCategories()
        }
    }, [open])

    const loadCategories = async () => {
        try {
            const data = await getCategories()
            setCategories(data)
        } catch (error) {
            console.error('Error loading categories:', error)
        }
    }

    /**
     * Gets supported formats for selected bank and source type.
     */
    const getSupportedFormats = () => {
        if (!bank) return 'Selecione o banco primeiro'
        const formats = BANK_FORMATS[bank]
        if (!formats) return 'OFX, CSV'
        return formats[sourceType]?.join(', ') || 'OFX, CSV'
    }

    /**
     * Handles file drop or selection.
     */
    const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) {
            setFile(droppedFile)
            // Auto-detect bank name from file name
            const fileName = droppedFile.name.toLowerCase()
            if (fileName.includes('nubank')) setBank('nubank')
            else if (fileName.includes('inter')) setBank('inter')
            else if (fileName.includes('itau')) setBank('itau')
        }
    }, [])

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
        }
    }

    /**
     * Validates file type matches source type selection.
     * Returns error message if file type doesn't match the selected source type.
     */
    const validateFileType = async (content: string, fileName: string): Promise<{ valid: boolean; message?: string }> => {
        const lines = content.split('\n').filter(l => l.trim())
        const fileNameLower = fileName.toLowerCase()
        const isOFX = fileNameLower.endsWith('.ofx')
        const isCSV = fileNameLower.endsWith('.csv')

        // Check filename for hints
        const fileNameHasFatura = fileNameLower.includes('fatura') || fileNameLower.includes('cartao') || fileNameLower.includes('credit')
        const fileNameHasExtrato = fileNameLower.includes('extrato') || fileNameLower.includes('conta') || fileNameLower.includes('statement')

        // Validate based on filename hints
        if (fileNameHasFatura && sourceType === 'extrato') {
            return {
                valid: false,
                message: `⚠️ Arquivo incorreto!\n\nO arquivo "${fileName}" parece ser uma FATURA (cartão de crédito), mas você selecionou "Extrato Bancário".\n\nPor favor, selecione "Fatura de Cartão" e tente novamente.`
            }
        }

        if (fileNameHasExtrato && sourceType === 'fatura') {
            return {
                valid: false,
                message: `⚠️ Arquivo incorreto!\n\nO arquivo "${fileName}" parece ser um EXTRATO (conta corrente), mas você selecionou "Fatura de Cartão".\n\nPor favor, selecione "Extrato Bancário" e tente novamente.`
            }
        }

        // For CSV files - analyze content
        if (isCSV) {
            const firstLine = lines[0] || ''
            const secondLine = lines[1] || ''

            // Nubank Fatura: date in YYYY-MM-DD format, 3 columns (date,title,amount)
            // Nubank Extrato: date in DD/MM/YYYY format, 4 columns (Data,Valor,Identificador,Descrição)
            const isISODate = /^\d{4}-\d{2}-\d{2}/.test(secondLine)
            const isBRDate = /^\d{2}\/\d{2}\/\d{4}/.test(secondLine)

            // Check header for hints
            const headerLower = firstLine.toLowerCase()
            const hasExtratoHeader = headerLower.includes('data,valor') || headerLower.includes('identificador')
            const hasFaturaHeader = headerLower.includes('date,') || headerLower.includes('title') || headerLower.includes('category')

            // Nubank specific detection
            if (bank === 'nubank' || fileNameLower.includes('nubank')) {
                if (sourceType === 'extrato' && (isISODate || hasFaturaHeader)) {
                    return {
                        valid: false,
                        message: `⚠️ Tipo de arquivo incorreto!\n\nEste arquivo CSV parece ser uma FATURA do Nubank (formato de data YYYY-MM-DD).\n\nVocê selecionou "Extrato Bancário", mas o arquivo é uma fatura de cartão de crédito.\n\n✅ Solução: Selecione "Fatura de Cartão" e tente novamente.`
                    }
                }

                if (sourceType === 'fatura' && (isBRDate || hasExtratoHeader)) {
                    return {
                        valid: false,
                        message: `⚠️ Tipo de arquivo incorreto!\n\nEste arquivo CSV parece ser um EXTRATO do Nubank (formato de data DD/MM/YYYY).\n\nVocê selecionou "Fatura de Cartão", mas o arquivo é um extrato de conta corrente.\n\n✅ Solução: Selecione "Extrato Bancário" e tente novamente.`
                    }
                }
            }

            // Generic CSV validation for other banks
            if (sourceType === 'extrato' && hasFaturaHeader) {
                return {
                    valid: false,
                    message: `⚠️ Arquivo incorreto!\n\nO conteúdo do arquivo parece ser uma FATURA, mas você selecionou "Extrato Bancário".\n\nSelecione "Fatura de Cartão" e tente novamente.`
                }
            }

            if (sourceType === 'fatura' && hasExtratoHeader) {
                return {
                    valid: false,
                    message: `⚠️ Arquivo incorreto!\n\nO conteúdo do arquivo parece ser um EXTRATO, mas você selecionou "Fatura de Cartão".\n\nSelecione "Extrato Bancário" e tente novamente.`
                }
            }
        }

        // For OFX files - check content type
        if (isOFX) {
            const contentUpper = content.toUpperCase()

            // OFX files usually contain bank statement data
            // Credit card OFX has different structure
            const isCreditCardOFX = contentUpper.includes('CCSTMTRS') || contentUpper.includes('CREDITCARD')
            const isBankStatementOFX = contentUpper.includes('STMTRS') && !isCreditCardOFX

            if (sourceType === 'extrato' && isCreditCardOFX) {
                return {
                    valid: false,
                    message: `⚠️ Tipo de arquivo OFX incorreto!\n\nEste arquivo OFX contém dados de CARTÃO DE CRÉDITO, mas você selecionou "Extrato Bancário".\n\n✅ Solução: Selecione "Fatura de Cartão" e tente novamente.`
                }
            }

            if (sourceType === 'fatura' && isBankStatementOFX) {
                return {
                    valid: false,
                    message: `⚠️ Tipo de arquivo OFX incorreto!\n\nEste arquivo OFX contém dados de CONTA CORRENTE, mas você selecionou "Fatura de Cartão".\n\n✅ Solução: Selecione "Extrato Bancário" e tente novamente.`
                }
            }
        }

        return { valid: true }
    }


    /**
     * Uploads and parses the file.
     */
    const handleParse = async () => {
        // Mark that user attempted to submit
        setHasAttemptedSubmit(true)
        setValidationError(null)

        if (!file) {
            toast.error('Selecione um arquivo')
            return
        }

        if (!bank) {
            // Error shown inline when hasAttemptedSubmit is true
            return
        }

        setLoading(true)

        try {
            // Read file content
            const content = await file.text()

            // Validate file type
            const validation = await validateFileType(content, file.name)
            if (!validation.valid) {
                // Show inline error instead of toast
                setValidationError(validation.message || 'Erro de validação')
                setLoading(false)
                return
            }

            const base64Content = btoa(unescape(encodeURIComponent(content)))

            // Call parse API
            const response = await fetch('/api/import/parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileContent: base64Content,
                    fileName: file.name,
                    bank: bank || undefined,
                    sourceType,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                // Show detailed error with parseErrors if available
                const errorDetails = data.details?.join('\n') || data.error || 'Erro ao processar arquivo'
                setValidationError(errorDetails)
                setLoading(false)
                return
            }

            // Check if no transactions were found
            if (!data.transactions || data.transactions.length === 0) {
                const parseErrors = data.parseErrors?.join('\n') || 'Nenhuma transação encontrada no arquivo.'
                setValidationError(`⚠️ Arquivo sem transações!\n\n${parseErrors}\n\n✅ Verifique se o arquivo contém movimentações ou se o tipo (Extrato/Fatura) está correto.`)
                setLoading(false)
                return
            }

            // Store transactions
            setTransactions(data.transactions)
            setStats({
                total: data.transactions.length,
                duplicates: data.transactions.filter((t: ParsedTransaction) => t.isPossibleDuplicate).length,
            })

            // Pre-select non-duplicates
            const nonDuplicates = new Set<number>()
            data.transactions.forEach((tx: ParsedTransaction, i: number) => {
                if (!tx.isPossibleDuplicate) nonDuplicates.add(i)
            })
            setSelectedTxs(nonDuplicates)

            // Set account name from bank
            const bankInfo = SUPPORTED_BANKS.find(b => b.id === bank)
            if (bankInfo) setAccountName(bankInfo.name)

            setStep('preview')
        } catch (err: any) {
            setValidationError(`Erro inesperado: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    /**
     * Confirms and saves selected transactions.
     */
    const handleConfirm = async () => {
        if (selectedTxs.size === 0) {
            toast.error('Selecione ao menos uma transação')
            return
        }

        if (!accountName) {
            toast.error('Informe o nome da conta')
            return
        }

        setLoading(true)

        try {
            // Prepare transactions for import
            const txsToImport = transactions
                .filter((_, i) => selectedTxs.has(i))
                .map(tx => ({
                    type: tx.type,
                    amount: tx.amount,
                    // Use extracted name if available, fallback to description
                    name: (tx.name || tx.description).substring(0, 50),
                    // Use paymentMethod for description (Pix, Boleto, etc), fallback to full description
                    description: tx.paymentMethod || tx.description,
                    date: tx.date,
                    categoryId: tx.suggestedCategoryId || 'default',
                    via: accountName,
                    currency: 'BRL' as const,
                }))

            // Call confirm API
            const response = await fetch('/api/import/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactions: txsToImport }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao importar')
            }

            toast.success(`${data.created} transações importadas!`)

            // Trigger server-side revalidation to update all components
            router.refresh()

            // Callback and close
            onImportComplete?.()
            resetModal()
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    /**
     * Resets modal state.
     */
    const resetModal = () => {
        setStep('upload')
        setFile(null)
        setBank('')
        setSourceType('extrato')
        setTransactions([])
        setSelectedTxs(new Set())
        setStats({ total: 0, duplicates: 0 })
        setAccountName('')
        setHasAttemptedSubmit(false)
        setValidationError(null)
        setOpen(false)
    }

    /**
     * Updates transaction category.
     */
    const updateTransactionCategory = (index: number, category: any) => {
        setTransactions(prev => prev.map((tx, i) =>
            i === index
                ? {
                    ...tx,
                    suggestedCategoryId: category.id,
                    suggestedCategoryName: category.name,
                    suggestedCategoryIcon: category.iconName || category.icon,
                    suggestedCategoryColor: category.color,
                }
                : tx
        ))
    }

    /**
     * Toggles transaction selection.
     */
    const toggleTx = (index: number) => {
        const newSet = new Set(selectedTxs)
        if (newSet.has(index)) {
            newSet.delete(index)
        } else {
            newSet.add(index)
        }
        setSelectedTxs(newSet)
    }

    /**
     * Select/deselect all transactions.
     */
    const toggleAll = () => {
        if (selectedTxs.size === transactions.length) {
            setSelectedTxs(new Set())
        } else {
            setSelectedTxs(new Set(transactions.map((_, i) => i)))
        }
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetModal() }}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" className="border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300">
                        <Upload className="h-4 w-4 mr-2" />
                        Importar
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className={`${step === 'preview' ? 'max-w-5xl' : 'max-w-lg'} max-h-[90vh] overflow-hidden flex flex-col`}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5 text-emerald-600" />
                        {step === 'upload' ? 'Importar Transações' : 'Revisar e Confirmar'}
                    </DialogTitle>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="space-y-4">
                        {/* Bank Selection - MANDATORY */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                                Banco <span className="text-red-500">*</span>
                            </label>
                            <Select value={bank} onValueChange={(v) => { setBank(v as BankType); setValidationError(null) }}>
                                <SelectTrigger className={hasAttemptedSubmit && !bank ? 'border-red-500' : ''}>
                                    <SelectValue placeholder="Selecione o banco" />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Validated banks */}
                                    {SUPPORTED_BANKS.filter(b => ['nubank', 'itau', 'inter', 'rico'].includes(b.id)).map(b => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name}
                                        </SelectItem>
                                    ))}
                                    {/* Separator */}
                                    <div className="h-px bg-gray-200 dark:bg-zinc-700 my-1" />
                                    {/* Non-validated banks (Em breve) */}
                                    {SUPPORTED_BANKS.filter(b => !['nubank', 'itau', 'inter', 'rico'].includes(b.id)).map(b => (
                                        <SelectItem key={b.id} value={b.id} disabled>
                                            <span className="flex items-center gap-2">
                                                {b.name}
                                                <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                                                    Em breve
                                                </span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {hasAttemptedSubmit && !bank && (
                                <p className="text-xs text-red-500 mt-1">Selecione o banco para continuar</p>
                            )}
                        </div>

                        {/* Source Type Selection */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                className={`
                                    p-3 rounded-lg border-2 text-left transition-colors
                                    ${sourceType === 'extrato'
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                                        : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                                    }
                                `}
                                onClick={() => setSourceType('extrato')}
                            >
                                <p className="font-medium text-gray-900 dark:text-white">Extrato Bancário</p>
                                <p className="text-xs text-gray-500">Conta corrente ou poupança</p>
                            </button>
                            {/* Fatura button - disabled for banks without fatura support */}
                            {(bank === 'itau') ? (
                                <div
                                    className="p-3 rounded-lg border-2 border-gray-200 dark:border-zinc-700 opacity-50 cursor-not-allowed relative"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="font-medium text-gray-500 dark:text-gray-400">Fatura de Cartão</p>
                                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">
                                            Em breve
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400">Cartão de crédito</p>
                                </div>
                            ) : (
                                <button
                                    className={`
                                        p-3 rounded-lg border-2 text-left transition-colors
                                        ${sourceType === 'fatura'
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                                            : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300'
                                        }
                                    `}
                                    onClick={() => setSourceType('fatura')}
                                >
                                    <p className="font-medium text-gray-900 dark:text-white">Fatura de Cartão</p>
                                    <p className="text-xs text-gray-500">Cartão de crédito</p>
                                </button>
                            )}
                        </div>

                        {/* Internet Banking notice for banks that only support web download */}
                        {(bank === 'itau' || bank === 'inter') && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    💡 <strong>Dica:</strong> Baixe o arquivo {bank === 'itau' ? 'OFX' : 'CSV'} pelo <strong>Internet Banking</strong> do {bank === 'itau' ? 'Itaú' : 'Inter'} (web). O app não oferece essa opção.
                                </p>
                            </div>
                        )}

                        {/* File Dropzone */}
                        <div
                            className={`
                                border-2 border-dashed rounded-lg p-8 text-center
                                transition-colors cursor-pointer
                                ${file
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                                    : 'border-gray-300 dark:border-zinc-700 hover:border-emerald-400'
                                }
                                ${!bank ? 'opacity-50 pointer-events-none' : ''}
                            `}
                            onDrop={handleFileDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => bank && document.getElementById('file-input')?.click()}
                        >
                            <input
                                id="file-input"
                                type="file"
                                className="hidden"
                                accept=".ofx,.csv,.pdf,.xlsx,.xls"
                                onChange={handleFileSelect}
                                disabled={!bank}
                            />

                            {file ? (
                                <div className="flex items-center justify-center gap-3">
                                    <FileText className="h-8 w-8 text-emerald-600" />
                                    <div className="text-left">
                                        <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
                                        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={(e) => { e.stopPropagation(); setFile(null) }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Arraste o arquivo aqui ou clique para selecionar
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Formatos suportados: <span className="font-medium">{getSupportedFormats()}</span>
                                    </p>
                                </>
                            )}
                        </div>

                        {/* Validation Error Alert */}
                        {validationError && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-red-800 dark:text-red-200 mb-1">Arquivo Incorreto</p>
                                        <p className="text-sm text-red-600 dark:text-red-300 whitespace-pre-line">
                                            {validationError}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Parse Button */}
                        <Button
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={!file || loading}
                            onClick={handleParse}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Processar Arquivo
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        {/* Stats & Account */}
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <Badge variant="outline" className="gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    {selectedTxs.size}/{stats.total} selecionadas
                                </Badge>
                                {stats.duplicates > 0 && (
                                    <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                                        <AlertTriangle className="h-3 w-3" />
                                        {stats.duplicates} possíveis duplicatas
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-500">Conta:</span>
                                <input
                                    type="text"
                                    className="px-2 py-1 border rounded text-sm w-32"
                                    placeholder="Nome da conta"
                                    value={accountName}
                                    onChange={(e) => setAccountName(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Transactions Table */}
                        <div className="flex-1 overflow-auto border rounded-lg">
                            <Table>
                                <TableHeader className="bg-emerald-600 sticky top-0">
                                    <TableRow className="hover:bg-emerald-600">
                                        <TableHead className="w-10 text-white">
                                            <Checkbox
                                                checked={selectedTxs.size === transactions.length}
                                                onCheckedChange={toggleAll}
                                                className="border-white/50"
                                            />
                                        </TableHead>
                                        <TableHead className="text-white">Categoria</TableHead>
                                        <TableHead className="text-white">Nome</TableHead>
                                        <TableHead className="text-white">Descrição</TableHead>
                                        <TableHead className="text-white">Data</TableHead>
                                        <TableHead className="text-white text-right">Valor</TableHead>
                                        <TableHead className="w-10"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx, i) => (
                                        <TableRow
                                            key={i}
                                            className={`
                                                ${tx.isPossibleDuplicate ? 'bg-amber-50 dark:bg-amber-900/10' : ''}
                                                ${i % 2 === 0 ? '' : 'bg-gray-50 dark:bg-zinc-800/30'}
                                            `}
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedTxs.has(i)}
                                                    onCheckedChange={() => toggleTx(i)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <CategorySelectionDialog
                                                    currentCategory={tx.suggestedCategoryId || ''}
                                                    onSelect={(cat) => updateTransactionCategory(i, cat)}
                                                >
                                                    <div className="hover:opacity-80 transition-opacity cursor-pointer">
                                                        <CategoryBadge
                                                            categoryName={tx.suggestedCategoryName || 'Outros'}
                                                            iconName={tx.suggestedCategoryIcon}
                                                            color={tx.suggestedCategoryColor}
                                                            size="sm"
                                                            interactive={false}
                                                        />
                                                    </div>
                                                </CategorySelectionDialog>
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate font-medium" title={tx.name || tx.description}>
                                                {tx.name || tx.description.substring(0, 30)}
                                            </TableCell>
                                            <TableCell className="max-w-[150px] truncate text-gray-500 text-sm" title={tx.paymentMethod || tx.description}>
                                                {tx.paymentMethod || 'Sem descrição'}
                                            </TableCell>
                                            <TableCell className="text-gray-500">
                                                {format(new Date(tx.date), "d 'de' MMM", { locale: ptBR })}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${tx.type === 'expense' ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {tx.type === 'expense' ? '- ' : '+ '}
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                                            </TableCell>
                                            <TableCell>
                                                {tx.isPossibleDuplicate && (
                                                    <span title={tx.duplicateReason}>
                                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Actions */}
                        <DialogFooter className="mt-4 flex-shrink-0">
                            <Button variant="outline" onClick={() => setStep('upload')}>
                                Voltar
                            </Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={selectedTxs.size === 0 || loading}
                                onClick={handleConfirm}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Importar {selectedTxs.size} transações
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
