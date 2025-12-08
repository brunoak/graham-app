"use client"

import { useState } from "react"
import { Search, Plus, Trash2, Check, Edit2, ArrowLeft, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    CATEGORIES,
    Category,
    addCategory,
    removeCategory,
    AVAILABLE_ICONS,
    CATEGORY_TYPES,
    CATEGORY_CLASSIFICATIONS,
    COLOR_OPTIONS
} from "@/lib/categories"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import Link from "next/link"

export default function CategoriesPage() {
    const [search, setSearch] = useState("")
    const [view, setView] = useState<"list" | "form">("list")

    // Delete Confirmation State
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState<{
        name: string
        description: string
        type: string
        classification: string
        iconName: string
        color: string
    }>({
        name: "",
        description: "",
        type: "Necessidades básicas",
        classification: "Despesa",
        iconName: "MoreHorizontal",
        color: "text-gray-500"
    })

    // Filter Categories
    const filteredCategories = CATEGORIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
    )

    const groupedCategories = filteredCategories.reduce((acc, category) => {
        const type = category.type
        if (!acc[type]) acc[type] = []
        acc[type].push(category)
        return acc
    }, {} as Record<string, Category[]>)

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            type: "Necessidades básicas",
            classification: "Despesa",
            iconName: "MoreHorizontal",
            color: "text-gray-500"
        })
        setEditingId(null)
    }

    const handleSave = () => {
        if (!formData.name) return

        const newCategory: Category = {
            id: editingId || crypto.randomUUID(),
            name: formData.name,
            description: formData.description,
            type: formData.type,
            classification: formData.classification,
            icon: AVAILABLE_ICONS[formData.iconName as keyof typeof AVAILABLE_ICONS] || AVAILABLE_ICONS.MoreHorizontal,
            color: formData.color
        }

        if (editingId) {
            removeCategory(editingId)
        }
        addCategory(newCategory)

        resetForm()
        setView("list")
    }

    const handleDelete = (category: Category) => {
        setCategoryToDelete(category)
    }

    const confirmDelete = () => {
        if (categoryToDelete) {
            removeCategory(categoryToDelete.id)
            setCategoryToDelete(null)
            setSearch(s => s + " ")
            setTimeout(() => setSearch(s => s.trim()), 0)
        }
    }

    const handleEditStart = (category: Category) => {
        const iconEntry = Object.entries(AVAILABLE_ICONS).find(([_, iconCmd]) => iconCmd === category.icon)
        const iconName = iconEntry ? iconEntry[0] : "MoreHorizontal"

        setFormData({
            name: category.name,
            description: category.description || "",
            type: category.type,
            classification: category.classification,
            iconName,
            color: category.color
        })
        setEditingId(category.id)
        setView("form")
    }

    return (
        <div className="bg-white dark:bg-zinc-900 min-h-screen pb-20 animate-in fade-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-4 py-4">
                <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-2">
                        {view === "form" ? (
                            <Button variant="ghost" size="icon" className="-ml-2" onClick={() => setView("list")}>
                                <ArrowLeft className="h-6 w-6" />
                            </Button>
                        ) : (
                            <Link href="/dashboard/transactions">
                                <Button variant="ghost" size="icon" className="-ml-2">
                                    <ArrowLeft className="h-6 w-6" />
                                </Button>
                            </Link>
                        )}
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                            {view === "form" ? (editingId ? "Editar Categoria" : "Nova Categoria") : "Categorias"}
                        </h1>
                    </div>
                    {view === "list" && (
                        <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-4"
                            onClick={() => {
                                resetForm()
                                setView("form")
                            }}
                        >
                            <Plus className="mr-1 h-4 w-4" /> Nova
                        </Button>
                    )}
                </div>

                {view === "list" && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar categoria..."
                            className="pl-9 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus-visible:ring-emerald-500 rounded-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-4">
                {view === "form" ? (
                    <div key="form" className="space-y-6 max-w-lg mx-auto animate-in fade-in zoom-in-95 duration-300">
                        {/* Form Content (copied from dialog) */}
                        <div className="grid grid-cols-1 gap-6">
                            <div className="space-y-3">
                                <Label>Ícone</Label>
                                <div className="grid grid-cols-6 gap-2 p-3 border rounded-lg bg-gray-50 dark:bg-zinc-800/50 max-h-[220px] overflow-y-auto">
                                    {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
                                        <button
                                            key={name}
                                            onClick={() => setFormData({ ...formData, iconName: name })}
                                            className={cn(
                                                "h-8 w-8 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-zinc-700 transition-colors",
                                                formData.iconName === name ? "bg-white dark:bg-zinc-700 shadow-sm ring-2 ring-emerald-500" : "text-gray-500"
                                            )}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label>Cor</Label>
                                <div className="flex flex-wrap gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                                    {COLOR_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setFormData({ ...formData, color: opt.value })}
                                            className={cn(
                                                "h-8 w-8 rounded-full cursor-pointer hover:scale-110 transition-transform border border-transparent hover:border-gray-300",
                                                opt.bg,
                                                formData.color === opt.value ? "ring-2 ring-offset-2 ring-emerald-500 shadow-md" : ""
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="name">Nome da Categoria</Label>
                            <Input
                                id="name"
                                placeholder="Ex: Assinaturas de TV..."
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <Label>Tipo</Label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORY_TYPES.map(t => (
                                    <Badge
                                        key={t}
                                        variant={formData.type === t ? "default" : "outline"}
                                        className={cn(
                                            "cursor-pointer px-3 py-1",
                                            formData.type === t ? "bg-emerald-600 hover:bg-emerald-700" : ""
                                        )}
                                        onClick={() => setFormData({ ...formData, type: t })}
                                    >
                                        {t}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label>Classificação</Label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORY_CLASSIFICATIONS.map(c => (
                                    <Badge
                                        key={c}
                                        variant={formData.classification === c ? "default" : "outline"}
                                        className={cn(
                                            "cursor-pointer px-3 py-1",
                                            formData.classification === c ? "bg-emerald-600 hover:bg-emerald-700" : ""
                                        )}
                                        onClick={() => setFormData({ ...formData, classification: c })}
                                    >
                                        {c}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="pt-8">
                            <Button className="w-full h-12 text-lg bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20" onClick={handleSave}>
                                {editingId ? "Salvar Alterações" : "Criar Categoria"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div key="list" className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                        {Object.keys(groupedCategories).length === 0 ? (
                            <div className="text-center py-20 text-gray-500 flex flex-col items-center gap-4">
                                <div className="h-16 w-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                                    <LayoutGrid className="h-8 w-8 text-gray-400" />
                                </div>
                                <p>Nenhuma categoria encontrada.</p>
                            </div>
                        ) : (
                            Object.entries(groupedCategories).map(([type, categories]) => (
                                <div key={type}>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">{type}</h4>
                                    <div className="space-y-3">
                                        {categories.map((category) => {
                                            const Icon = category.icon
                                            return (
                                                <div
                                                    key={category.id}
                                                    className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-800 active:scale-[0.98] transition-all"
                                                    onClick={() => handleEditStart(category)}
                                                >
                                                    <div className={cn(
                                                        "h-12 w-12 shrink-0 rounded-full flex items-center justify-center bg-white dark:bg-zinc-800 shadow-sm",
                                                        category.color
                                                    )}>
                                                        <Icon className="h-6 w-6" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-lg">
                                                            {category.name}
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {category.classification}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-gray-400"
                                                    >
                                                        <Edit2 className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir a categoria "{categoryToDelete?.name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
