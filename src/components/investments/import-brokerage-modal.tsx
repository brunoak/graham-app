/**
 * @fileoverview B3 Excel Import Modal Component
 * 
 * A dialog component that allows users to import investment movements from B3 Excel files.
 * The modal guides the user through a 3-step process:
 * 
 * 1. **Upload**: Select and upload an XLSX file from B3
 * 2. **Preview**: Review extracted operations before importing
 * 3. **Result**: See import results and any errors
 * 
 * @module components/investments/import-brokerage-modal
 * 
 * @example
 * ```tsx
 * <ImportBrokerageModal onImportComplete={() => refreshAssets()} />
 * ```
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
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    ArrowRight,
    TrendingUp,
    TrendingDown,
    ExternalLink,
    Coins,
} from "lucide-react"
import { toast } from "sonner"
import { parseB3XLSX, type B3Operation } from "@/lib/parsers/b3-xlsx-parser"
import { createInvestmentTransaction } from "@/lib/actions/investment-actions"
import type { AssetType } from "@/lib/schemas/investment-schema"

// ============================================
// Types
// ============================================

interface ImportBrokerageModalProps {
    /** Callback fired after successful import */
    onImportComplete?: () => void
}

interface SelectableOperation extends B3Operation {
    selected: boolean
}

type ImportStep = "upload" | "preview" | "result"

// ============================================
// Component
// ============================================

/**
 * ImportBrokerageModal - Modal for importing B3 Excel movements
 * 
 * Features:
 * - Drag and drop file upload
 * - Client-side XLSX parsing
 * - Selective operation import
 * - Progress feedback
 * - Integration with existing investment actions
 */
export function ImportBrokerageModal({ onImportComplete }: ImportBrokerageModalProps) {
    // State
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<ImportStep>("upload")
    const [file, setFile] = useState<File | null>(null)
    const [loading, setLoading] = useState(false)
    const [operations, setOperations] = useState<SelectableOperation[]>([])
    const [parseErrors, setParseErrors] = useState<string[]>([])
    const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)
    const [importResult, setImportResult] = useState<{
        success: boolean
        message: string
        successCount: number
        errorCount: number
        errors: string[]
    } | null>(null)

    // ========================================
    // Handlers
    // ========================================

    /**
     * Handles file selection from input or drag-drop
     */
    const handleFileSelect = useCallback((selectedFile: File) => {
        const validTypes = [
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel"
        ]

        if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.xlsx')) {
            toast.error("Por favor, selecione um arquivo Excel (.xlsx)")
            return
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error("Arquivo muito grande. Máximo 10MB.")
            return
        }

        setFile(selectedFile)
    }, [])

    /**
     * Parses the uploaded Excel file client-side
     */
    const handleParse = useCallback(async () => {
        if (!file) return

        setLoading(true)
        setParseErrors([])

        try {
            const buffer = await file.arrayBuffer()
            const result = await parseB3XLSX(buffer)

            if (result.errorCount > 0 && result.successCount === 0) {
                toast.error("Não foi possível extrair operações do arquivo")
                setParseErrors(result.errors)
                return
            }

            // Set operations with selection state
            setOperations(
                result.operations.map(op => ({
                    ...op,
                    selected: true
                }))
            )

            setDateRange(result.dateRange || null)
            setParseErrors(result.errors)
            setStep("preview")

            toast.success(`${result.successCount} operações encontradas`)

        } catch (error) {
            console.error("Error parsing B3 Excel:", error)
            toast.error(error instanceof Error ? error.message : "Erro ao processar arquivo")
        } finally {
            setLoading(false)
        }
    }, [file])

    /**
     * Imports selected operations to the database
     */
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
            // Import each operation individually
            for (const op of selectedOps) {
                try {
                    await createInvestmentTransaction({
                        ticker: op.ticker,
                        type: op.type,
                        date: op.date,
                        quantity: op.quantity,
                        price: op.price,
                        fees: 0,
                        total: op.total,
                        assetType: op.assetType as AssetType,
                        assetName: op.name,
                        currency: "BRL"
                    })
                    successCount++
                } catch (err: any) {
                    errorCount++
                    errors.push(`${op.ticker}: ${err.message}`)
                }
            }

            const success = errorCount === 0
            const message = success
                ? `${successCount} operações importadas com sucesso!`
                : `${successCount} importadas, ${errorCount} erros`

            setImportResult({
                success,
                message,
                successCount,
                errorCount,
                errors
            })

            setStep("result")

            if (success) {
                toast.success(message)
                onImportComplete?.()
            } else if (successCount > 0) {
                toast.warning(message)
                onImportComplete?.()
            } else {
                toast.error(message)
            }

        } catch (error) {
            console.error("Error importing operations:", error)
            toast.error("Erro ao importar operações")
        } finally {
            setLoading(false)
        }
    }, [operations, onImportComplete])

    /**
     * Toggles selection of an operation
     */
    const toggleOperation = useCallback((index: number) => {
        setOperations(prev => prev.map((op, i) =>
            i === index ? { ...op, selected: !op.selected } : op
        ))
    }, [])

    /**
     * Toggles all operations selection
     */
    const toggleAllOperations = useCallback((checked: boolean) => {
        setOperations(prev => prev.map(op => ({ ...op, selected: checked })))
    }, [])

    /**
     * Resets the modal to initial state
     */
    const resetModal = useCallback(() => {
        setStep("upload")
        setFile(null)
        setOperations([])
        setParseErrors([])
        setDateRange(null)
        setImportResult(null)
    }, [])

    /**
     * Formats currency value
     */
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL"
        }).format(value)
    }

    /**
     * Formats date
     */
    const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString("pt-BR")
    }

    /**
     * Gets type badge variant
     */
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

    // Computed values
    const selectedCount = operations.filter(op => op.selected).length
    const totalFees = 0 // B3 doesn't include fees

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
                    className="h-9 w-9 p-0 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-zinc-800 flex items-center justify-center"
                    title="Importar Movimentações B3"
                >
                    <Upload className="h-4 w-4" />
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        Importar Movimentações da B3
                    </DialogTitle>
                    <DialogDescription>
                        {step === "upload" && "Envie o arquivo Excel de movimentação baixado do portal B3."}
                        {step === "preview" && "Revise as operações encontradas e selecione quais deseja importar."}
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
                        {/* B3 Instructions */}
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

                        {/* File Drop Zone */}
                        <div
                            className={`
                                relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                                ${file ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/10" : "border-gray-200 dark:border-zinc-700 hover:border-emerald-300"}
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
                                    <FileSpreadsheet className="h-12 w-12 mx-auto text-emerald-600" />
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
                                        Arraste o arquivo Excel aqui ou clique para selecionar
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Formato: Excel (.xlsx) exportado do portal B3
                                    </p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    const selectedFile = e.target.files?.[0]
                                    if (selectedFile) handleFileSelect(selectedFile)
                                }}
                            />
                        </div>

                        {/* Parse Errors */}
                        {parseErrors.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <p className="font-medium text-red-800 dark:text-red-200 mb-2">
                                    Erros encontrados:
                                </p>
                                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                    {parseErrors.slice(0, 5).map((error, i) => (
                                        <li key={i}>• {error}</li>
                                    ))}
                                    {parseErrors.length > 5 && (
                                        <li>...e mais {parseErrors.length - 5} erros</li>
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
                                    {dateRange ? `${formatDate(dateRange.start)} - ${formatDate(dateRange.end)}` : "-"}
                                </p>
                                <p className="text-xs text-gray-500">Período</p>
                            </div>
                        </div>

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
                                            <TableCell className="text-right">{op.quantity}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(op.price)}</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {formatCurrency(op.total)}
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

