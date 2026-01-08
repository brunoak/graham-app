/**
 * @fileoverview Unified Import Modal Component
 * 
 * A single dialog component for importing investment data from:
 * 1. B3 XLSX movements (Brazilian market)
 * 2. PDF brokerage notes (multiple brokers)
 */

"use client"

import { useState, useCallback } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Upload,
    FileSpreadsheet,
    FileText,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    Lock,
    ExternalLink,
    Coins,
} from "lucide-react"
import { toast } from "sonner"
import { parseB3XLSX, type B3Operation } from "@/lib/parsers/b3-xlsx-parser"
import { parseMyProfitXLSX, type MyProfitOperation } from "@/lib/parsers/myprofit-xlsx-parser"
import { parseStatusInvestXLSX, type StatusInvestOperation } from "@/lib/parsers/statusinvest-xlsx-parser"
import {
    parseBrokerageNotePDF,
    SUPPORTED_BROKERS,
    type ParserType,
    type ParsedOperation
} from "@/lib/services/pdf-parser-service"
import { createInvestmentTransaction } from "@/lib/actions/investment-actions"
import type { AssetType } from "@/lib/schemas/investment-schema"

// ============================================
// Types
// ============================================

interface UnifiedImportModalProps {
    onImportComplete?: () => void
}

// Unified operation type from either source
interface SelectableOperation {
    ticker: string
    name?: string
    type: "buy" | "sell" | "dividend"
    quantity: number
    price: number
    total: number
    date: Date
    assetType: string
    currency: string
    selected: boolean
}

type ImportSource = "b3-xlsx" | "myprofit-xlsx" | "statusinvest-xlsx" | "pdf-corretora"
type ImportStep = "upload" | "preview" | "result"

// Asset type mapping
const ASSET_TYPE_MAP: Record<string, AssetType> = {
    'stock_br': 'stock_br',
    'stock_us': 'stock_us',
    'reit_br': 'reit_br',
    'reit_us': 'reit_us',
    'etf_br': 'etf_br',
    'etf_us': 'etf_us',
    'crypto': 'crypto',
    'fixed_income': 'fixed_income',
    'fixed_income_us': 'fixed_income_us',
    'treasure': 'treasure',
    'fund': 'fund',
    'fiagro': 'fiagro',
    'fund_exempt': 'fund_exempt',
    'cash': 'cash',
    'bdr': 'stock_br',
    'option': 'stock_us',
    'other': 'stock_br',
}

// ============================================
// Component
// ============================================

export function UnifiedImportModal({ onImportComplete }: UnifiedImportModalProps) {
    // State
    const [open, setOpen] = useState(false)
    const [importSource, setImportSource] = useState<ImportSource>("b3-xlsx")
    const isMyProfit = importSource === "myprofit-xlsx"
    const [step, setStep] = useState<ImportStep>("upload")
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [operations, setOperations] = useState<SelectableOperation[]>([])
    const [warnings, setWarnings] = useState<string[]>([])
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)

    // PDF-specific state
    const [parserType, setParserType] = useState<ParserType>("br-nota")
    const [password, setPassword] = useState("")
    const [brokerName, setBrokerName] = useState<string | null>(null)

    // Result state
    const [importResult, setImportResult] = useState<{
        success: boolean
        message: string
        successCount: number
        errorCount: number
        errors: string[]
    } | null>(null)

    // Get broker config
    const brokerConfig = SUPPORTED_BROKERS[parserType]
    const isPDF = importSource === "pdf-corretora"
    const isStatusInvest = importSource === "statusinvest-xlsx"
    const isXLSX = importSource === "b3-xlsx" || importSource === "myprofit-xlsx" || importSource === "statusinvest-xlsx"

    // ========================================
    // Handlers
    // ========================================

    const handleFileSelect = useCallback((selectedFile: File) => {
        const filename = selectedFile.name.toLowerCase()

        if (isPDF) {
            if (!filename.endsWith('.pdf') && !filename.endsWith('.csv')) {
                toast.error("Por favor, selecione um arquivo PDF ou CSV")
                return
            }
        } else if (isXLSX) {
            if (!filename.endsWith('.xlsx') && !filename.endsWith('.xls')) {
                toast.error("Por favor, selecione um arquivo Excel (.xlsx)")
                return
            }
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error("Arquivo muito grande. Máximo 10MB.")
            return
        }

        setFile(selectedFile)
    }, [isPDF])

    const handleParse = useCallback(async () => {
        if (!file) return

        setLoading(true)
        setWarnings([])

        try {
            if (isPDF) {
                // Parse PDF
                const result = await parseBrokerageNotePDF(file, parserType, {
                    password: password || undefined,
                    debug: false
                })

                if (!result.success && result.operations.length === 0) {
                    toast.error("Não foi possível extrair operações do arquivo")
                    setWarnings(result.warnings)
                    return
                }

                // Convert to unified format
                setOperations(
                    result.operations.map(op => ({
                        ticker: op.ticker,
                        name: op.name,
                        type: op.type as "buy" | "sell",
                        quantity: op.quantity,
                        price: op.price,
                        total: op.total,
                        date: op.trade_date ? new Date(op.trade_date) : new Date(),
                        assetType: op.asset_type,
                        currency: op.currency,
                        selected: true
                    }))
                )

                setBrokerName(result.broker || null)
                setWarnings(result.warnings)

            } else if (isMyProfit) {
                // Parse MyProfit XLSX
                const buffer = await file.arrayBuffer()
                const result = await parseMyProfitXLSX(buffer)

                if (result.errorCount > 0 && result.successCount === 0) {
                    toast.error("Não foi possível extrair operações do arquivo")
                    setWarnings(result.errors)
                    return
                }

                // Convert to unified format
                setOperations(
                    result.operations.map(op => ({
                        ticker: op.ticker,
                        name: op.name,
                        type: op.type,
                        quantity: op.quantity,
                        price: op.price,
                        total: op.total,
                        date: op.date,
                        assetType: op.assetType,
                        currency: op.currency,
                        selected: true
                    }))
                )

                setDateRange(result.dateRange || null)
                setWarnings(result.errors)
            } else if (isStatusInvest) {
                // Parse Status Invest XLSX
                const buffer = await file.arrayBuffer()
                const result = await parseStatusInvestXLSX(buffer)

                if (result.errorCount > 0 && result.successCount === 0) {
                    toast.error("Não foi possível extrair operações do arquivo")
                    setWarnings(result.errors)
                    return
                }

                // Convert to unified format
                setOperations(
                    result.operations.map(op => ({
                        ticker: op.ticker,
                        name: op.category,
                        type: op.type,
                        quantity: op.quantity,
                        price: op.price,
                        total: op.total,
                        date: op.date,
                        assetType: op.assetType,
                        currency: op.currency,
                        selected: true
                    }))
                )

                setDateRange(result.dateRange || null)
                setWarnings(result.errors)
            } else {
                // Parse B3 XLSX
                const buffer = await file.arrayBuffer()
                const result = await parseB3XLSX(buffer)

                if (result.errorCount > 0 && result.successCount === 0) {
                    toast.error("Não foi possível extrair operações do arquivo")
                    setWarnings(result.errors)
                    return
                }

                // Convert to unified format
                setOperations(
                    result.operations.map(op => ({
                        ticker: op.ticker,
                        name: op.name,
                        type: op.type,
                        quantity: op.quantity,
                        price: op.price,
                        total: op.total,
                        date: op.date,
                        assetType: op.assetType,
                        currency: "BRL",
                        selected: true
                    }))
                )

                setDateRange(result.dateRange || null)
                setWarnings(result.errors)
            }

            setStep("preview")
            toast.success(`${operations.length > 0 ? operations.length : "Operações"} encontradas`)

        } catch (error) {
            console.error("Error parsing file:", error)
            const message = error instanceof Error ? error.message : "Erro ao processar arquivo"

            if (message.includes("password")) {
                toast.error("PDF protegido por senha. Informe seu CPF.")
            } else {
                toast.error(message)
            }
        } finally {
            setLoading(false)
        }
    }, [file, isPDF, parserType, password, operations.length])

    const handleImport = useCallback(async () => {
        const selectedOps = operations.filter(op => op.selected)
        if (selectedOps.length === 0) {
            toast.error("Selecione ao menos uma operação para importar")
            return
        }

        setLoading(true)

        let successCount = 0
        let errorCount = 0
        const errors: string[] = []

        try {
            for (const op of selectedOps) {
                try {
                    await createInvestmentTransaction({
                        ticker: op.ticker,
                        type: op.type === "dividend" ? "buy" : op.type,
                        date: op.date,
                        quantity: op.quantity,
                        price: op.price,
                        fees: 0,
                        total: op.total,
                        assetType: (ASSET_TYPE_MAP[op.assetType] || 'stock_br') as AssetType,
                        assetName: op.name,
                        currency: op.currency
                    })
                    successCount++
                } catch (err: unknown) {
                    errorCount++
                    const message = err instanceof Error ? err.message : 'Unknown error'
                    errors.push(`${op.ticker}: ${message}`)
                }
            }

            const success = errorCount === 0
            const message = success
                ? `${successCount} operações importadas com sucesso!`
                : `${successCount} importadas, ${errorCount} erros`

            if (success) {
                toast.success(message)
                onImportComplete?.()
                // Show success screen briefly, then auto-close
                setImportResult({ success, message, successCount, errorCount, errors })
                setStep("result")
                setTimeout(() => {
                    setOpen(false)
                    resetModal()
                }, 2000)
            } else if (successCount > 0) {
                toast.warning(message)
                onImportComplete?.()
                setImportResult({ success, message, successCount, errorCount, errors })
                setStep("result")
            } else {
                toast.error(message)
                setImportResult({ success, message, successCount, errorCount, errors })
                setStep("result")
            }

        } catch (error) {
            console.error("Error importing operations:", error)
            toast.error("Erro ao importar operações")
        } finally {
            setLoading(false)
        }
    }, [operations, onImportComplete])

    const toggleOperation = useCallback((index: number) => {
        setOperations(prev => prev.map((op, i) =>
            i === index ? { ...op, selected: !op.selected } : op
        ))
    }, [])

    const toggleAllOperations = useCallback((checked: boolean) => {
        setOperations(prev => prev.map(op => ({ ...op, selected: checked })))
    }, [])

    const resetModal = useCallback(() => {
        setStep("upload")
        setFile(null)
        setPassword("")
        setOperations([])
        setWarnings([])
        setDateRange(null)
        setBrokerName(null)
        setImportResult(null)
    }, [])

    const handleSourceChange = useCallback((source: ImportSource) => {
        setImportSource(source)
        setFile(null)
        setPassword("")
        setWarnings([])
    }, [])

    const formatCurrency = (value: number, currency: string = "BRL") => {
        const locale = currency === "USD" ? "en-US" : "pt-BR"
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: currency
        }).format(value)
    }

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("pt-BR")
    }

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "buy":
                return <Badge variant="default" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Compra
                </Badge>
            case "sell":
                return <Badge variant="default" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Venda
                </Badge>
            case "dividend":
                return <Badge variant="default" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <Coins className="h-3 w-3 mr-1" />
                    Provento
                </Badge>
            default:
                return <Badge variant="outline">{type}</Badge>
        }
    }

    const selectedCount = operations.filter(op => op.selected).length

    // ========================================
    // Render
    // ========================================

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetModal()
        }}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-800"
                    title="Importar Movimentações"
                >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Importar</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        {isPDF ? (
                            <FileText className="h-5 w-5 text-blue-600" />
                        ) : isMyProfit ? (
                            <FileSpreadsheet className="h-5 w-5 text-purple-600" />
                        ) : isStatusInvest ? (
                            <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        ) : (
                            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        )}
                        {isPDF
                            ? "Importar Nota de Corretagem"
                            : isMyProfit
                                ? "Importar Movimentações MyProfit"
                                : isStatusInvest
                                    ? "Importar Movimentações Status Invest"
                                    : "Importar Movimentações B3"
                        }
                    </DialogTitle>
                    <DialogDescription>
                        {step === "upload" && "Selecione a fonte dos dados e faça upload do arquivo."}
                        {step === "preview" && "Revise as operações e selecione quais deseja importar."}
                        {step === "result" && "Confira o resultado da importação."}
                    </DialogDescription>
                </DialogHeader>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 py-4">
                    <div className={`flex items-center gap-1 ${step === "upload" ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "upload" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100"}`}>1</span>
                        Upload
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                    <div className={`flex items-center gap-1 ${step === "preview" ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "preview" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100"}`}>2</span>
                        Preview
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-300" />
                    <div className={`flex items-center gap-1 ${step === "result" ? "text-emerald-600 font-medium" : "text-gray-400"}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step === "result" ? "bg-emerald-100 text-emerald-600" : "bg-gray-100"}`}>3</span>
                        Resultado
                    </div>
                </div>

                {/* Step: Upload */}
                {step === "upload" && (
                    <div className="space-y-4">
                        {/* Source Selector */}
                        <div className="space-y-2">
                            <Label>Fonte dos Dados</Label>
                            <Select value={importSource} onValueChange={(v) => handleSourceChange(v as ImportSource)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="b3-xlsx">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                            <span>Movimentações B3 (Excel)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="myprofit-xlsx">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-purple-600" />
                                            <span>Movimentações MyProfit (Excel)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="statusinvest-xlsx">
                                        <div className="flex items-center gap-2">
                                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                            <span>Movimentações Status Invest (Excel)</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="pdf-corretora">
                                        <div className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-blue-600" />
                                            <span>Nota de Corretagem (PDF)</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* B3 Instructions */}
                        {importSource === "b3-xlsx" && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-800 dark:text-blue-200">
                                        <p className="font-medium">Como baixar o arquivo da B3:</p>
                                        <ol className="mt-2 space-y-1 list-decimal list-inside text-blue-700 dark:text-blue-300">
                                            <li>Acesse <a href="https://www.investidor.b3.com.br" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline inline-flex items-center gap-1">investidor.b3.com.br <ExternalLink className="h-3 w-3" /></a></li>
                                            <li>Faça login e vá em <strong>Extratos</strong></li>
                                            <li>Selecione a aba <strong>Movimentação</strong></li>
                                            <li>Escolha o período desejado</li>
                                            <li>Clique em <strong>BAIXAR</strong> (Excel)</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MyProfit Instructions */}
                        {isMyProfit && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-purple-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-purple-800 dark:text-purple-200">
                                        <p className="font-medium">Como baixar o arquivo do MyProfit:</p>
                                        <ol className="mt-2 space-y-1 list-decimal list-inside text-purple-700 dark:text-purple-300">
                                            <li>Acesse <a href="https://myprofitweb.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline inline-flex items-center gap-1">myprofitweb.com <ExternalLink className="h-3 w-3" /></a></li>
                                            <li>Faça login e vá em <strong>Relatórios</strong></li>
                                            <li>Escolha o período desejado</li>
                                            <li>Clique em <strong>BAIXAR</strong> (Excel)</li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Status Invest Instructions */}
                        {isStatusInvest && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                                    <div className="text-sm text-green-800 dark:text-green-200">
                                        <p className="font-medium">Como baixar o arquivo do Status Invest:</p>
                                        <ol className="mt-2 space-y-1 list-decimal list-inside text-green-700 dark:text-green-300">
                                            <li>Acesse <a href="https://statusinvest.com.br" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline inline-flex items-center gap-1">statusinvest.com.br <ExternalLink className="h-3 w-3" /></a></li>
                                            <li>Faça login e vá em <strong>Carteira</strong> depois <strong>Transações</strong></li>
                                            <li>Escolha o período desejado</li>
                                            <li>Clique em <strong>Exportar</strong></li>
                                        </ol>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PDF Options */}
                        {isPDF && (
                            <>
                                {/* Broker Selector */}
                                <div className="space-y-2">
                                    <Label>Corretora</Label>
                                    <Select value={parserType} onValueChange={(v) => setParserType(v as ParserType)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(SUPPORTED_BROKERS).map(([key, broker]) => (
                                                <SelectItem key={key} value={key}>
                                                    <div className="flex items-center gap-2">
                                                        {broker.label}
                                                        <span className="text-xs text-gray-500">({broker.currency})</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-gray-500">{brokerConfig.description}</p>
                                </div>

                                {/* Password field */}
                                {brokerConfig.requiresPassword && (
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            <Lock className="h-4 w-4" />
                                            Senha do PDF
                                        </Label>
                                        <Input
                                            type="password"
                                            placeholder={brokerConfig.passwordHint}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <p className="text-xs text-gray-500">
                                            Rico, XP, Clear e BTG usam seu CPF como senha.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* File Drop Zone */}
                        <div
                            className={`
                                relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                                ${file
                                    ? (isPDF ? "border-blue-300 bg-blue-50 dark:bg-blue-900/10" : "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10")
                                    : "border-gray-200 dark:border-zinc-700 hover:border-emerald-300"
                                }
                            `}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault()
                                const droppedFile = e.dataTransfer.files[0]
                                if (droppedFile) handleFileSelect(droppedFile)
                            }}
                        >
                            {file ? (
                                <div className="space-y-2">
                                    {isPDF ? (
                                        <FileText className="h-12 w-12 mx-auto text-blue-600" />
                                    ) : (
                                        <FileSpreadsheet className="h-12 w-12 mx-auto text-emerald-600" />
                                    )}
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setFile(null)}
                                    >
                                        Trocar arquivo
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                                    <p className="font-medium">
                                        Arraste o arquivo aqui ou clique para selecionar
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {isPDF
                                            ? "Formato: PDF da nota de corretagem"
                                            : isMyProfit
                                                ? "Formato: Excel (.xlsx) exportado do MyProfit"
                                                : isStatusInvest
                                                    ? "Formato: Excel (.xlsx) exportado do Status Invest"
                                                    : "Formato: Excel (.xlsx) exportado do portal B3"
                                        }
                                    </p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept={isPDF ? ".pdf,.csv" : ".xlsx,.xls"}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0]
                                    if (selectedFile) handleFileSelect(selectedFile)
                                }}
                            />
                        </div>

                        {/* Warnings */}
                        {warnings.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                                <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                                    Avisos:
                                </p>
                                <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                                    {warnings.slice(0, 5).map((warning, i) => (
                                        <li key={i}>• {warning}</li>
                                    ))}
                                    {warnings.length > 5 && (
                                        <li>...e mais {warnings.length - 5}</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Step: Preview */}
                {step === "preview" && (
                    <div className="space-y-4">
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-emerald-600">{operations.length}</p>
                                <p className="text-xs text-gray-500">Operações</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-blue-600">{selectedCount}</p>
                                <p className="text-xs text-gray-500">Selecionadas</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 text-center">
                                <p className="text-sm font-medium">
                                    {isPDF && brokerName ? brokerName :
                                        dateRange ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}` : "—"}
                                </p>
                                <p className="text-xs text-gray-500">{isPDF ? "Corretora" : "Período"}</p>
                            </div>
                        </div>

                        {/* Warnings */}
                        {warnings.length > 0 && (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm">{warnings.join(", ")}</span>
                                </div>
                            </div>
                        )}

                        {/* Operations Table */}
                        <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white dark:bg-zinc-900">
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <Checkbox
                                                checked={selectedCount === operations.length}
                                                onCheckedChange={(checked) => toggleAllOperations(!!checked)}
                                            />
                                        </TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Ticker</TableHead>
                                        <TableHead className="text-right">Qtd</TableHead>
                                        <TableHead className="text-right">Preço</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {operations.map((op, index) => (
                                        <TableRow
                                            key={index}
                                            className={!op.selected ? "opacity-50" : ""}
                                        >
                                            <TableCell>
                                                <Checkbox
                                                    checked={op.selected}
                                                    onCheckedChange={() => toggleOperation(index)}
                                                />
                                            </TableCell>
                                            <TableCell>{getTypeBadge(op.type)}</TableCell>
                                            <TableCell className="font-medium">{op.ticker}</TableCell>
                                            <TableCell className="text-right">{op.quantity.toLocaleString()}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(op.price, op.currency)}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(op.total, op.currency)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}

                {/* Step: Result */}
                {step === "result" && importResult && (
                    <div className="space-y-4">
                        <div className={`
                            rounded-lg p-6 text-center
                            ${importResult.success
                                ? "bg-emerald-50 dark:bg-emerald-900/20"
                                : importResult.successCount > 0
                                    ? "bg-yellow-50 dark:bg-yellow-900/20"
                                    : "bg-red-50 dark:bg-red-900/20"
                            }
                        `}>
                            {importResult.success ? (
                                <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-600 mb-4" />
                            ) : importResult.successCount > 0 ? (
                                <AlertCircle className="h-16 w-16 mx-auto text-yellow-600 mb-4" />
                            ) : (
                                <XCircle className="h-16 w-16 mx-auto text-red-600 mb-4" />
                            )}

                            <p className="text-xl font-semibold">
                                {importResult.message}
                            </p>

                            <div className="flex justify-center gap-8 mt-4">
                                <div>
                                    <p className="text-2xl font-bold text-emerald-600">
                                        {importResult.successCount}
                                    </p>
                                    <p className="text-sm text-gray-500">Importadas</p>
                                </div>
                                {importResult.errorCount > 0 && (
                                    <div>
                                        <p className="text-2xl font-bold text-red-600">
                                            {importResult.errorCount}
                                        </p>
                                        <p className="text-sm text-gray-500">Erros</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Error Details */}
                        {importResult.errors.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-[200px] overflow-y-auto">
                                <p className="font-medium text-red-800 dark:text-red-200 mb-2">
                                    Detalhes dos erros:
                                </p>
                                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                    {importResult.errors.map((error, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                            <span>{error}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <DialogFooter className="flex gap-2 mt-4">
                    {step === "upload" && (
                        <>
                            <Button variant="outline" onClick={() => setOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleParse}
                                disabled={!file || loading}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : (
                                    "Processar Arquivo"
                                )}
                            </Button>
                        </>
                    )}

                    {step === "preview" && (
                        <>
                            <Button variant="outline" onClick={() => setStep("upload")}>
                                Voltar
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={selectedCount === 0 || loading}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Importar {selectedCount} Operações
                                    </>
                                )}
                            </Button>
                        </>
                    )}

                    {step === "result" && (
                        <Button onClick={() => setOpen(false)} className="w-full">
                            Fechar
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// Re-export for convenience with old name
export { UnifiedImportModal as ImportBrokerageModal }
