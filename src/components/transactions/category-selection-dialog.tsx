
import { useState } from "react"
import { Search, Plus, Trash2, Check, Edit2, ArrowLeft } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
    CATEGORIES,
    getCategoryByName,
    Category,
    addCategory,
    removeCategory,
    AVAILABLE_ICONS,
    CATEGORY_TYPES,
    CATEGORY_CLASSIFICATIONS,
    CategoryType,
    CategoryClassification,
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

interface CategorySelectionDialogProps {
    currentCategory: string
    onSelect: (category: string) => void
    children: React.ReactNode
    onOpenChange?: (open: boolean) => void
}

export function CategorySelectionDialog({ currentCategory, onSelect, children, onOpenChange }: CategorySelectionDialogProps) {
    const [open, setOpen] = useState(false)
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

    const handleSelect = (category: Category) => {
        onSelect(category.name)
        setOpen(false)
    }

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

        // Simulating update by removing old if editing and adding new
        // Since we don't have a real update method in the mock
        if (editingId) {
            removeCategory(editingId)
        }
        addCategory(newCategory)

        // Select it immediately
        onSelect(newCategory.name)
        setOpen(false)
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
            // If the deleted category was selected, maybe clear selection? Or leave it.
            // For now we just refresh the view (React re-renders as CATEGORIES array mutates)
            // Note: In a real app we'd need state to trigger re-render of list logic, but since this component re-renders on state change, and CATEGORIES is global (kinda), it might lag unless we force update.
            // Actually, since CATEGORIES is external, react won't see the push/slice.
            // We need a brute force re-render. Let's toggle 'search' or add a version state.
            setSearch(s => s + " ") // trigger re-render hack
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
        <>
            <Dialog open={open} onOpenChange={(v) => {
                setOpen(v)
                onOpenChange?.(v)
                if (!v) {
                    setView("list")
                    resetForm()
                }
            }}>
                <DialogTrigger asChild>
                    {children}
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white dark:bg-zinc-900 transition-all">
                    <DialogHeader className="p-6 pb-2 border-b border-gray-100 dark:border-zinc-800 pr-14 shrink-0">
                        <div className="flex items-center justify-between gap-4">
                            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                                {view === "form" && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 mr-1" onClick={() => setView("list")}>
                                        <ArrowLeft className="h-5 w-5" />
                                    </Button>
                                )}
                                {view === "form" ? (editingId ? "Editar Categoria" : "Nova Categoria") : "Categorias"}
                            </DialogTitle>
                            {view === "list" && (
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                                    onClick={() => {
                                        resetForm()
                                        setView("form")
                                    }}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Nova Categoria
                                </Button>
                            )}
                        </div>
                        {view === "list" && (
                            <div className="relative mt-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar categoria..."
                                    className="pl-9 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus-visible:ring-emerald-500"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                        )}
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6">
                        {view === "form" ? (
                            <div className="space-y-6">
                                {/* Color & Icon Picker section */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                                    title={name}
                                                >
                                                    <Icon className="h-4 w-4" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label>Cor</Label>
                                        <div className="grid grid-cols-5 gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-zinc-800/50 h-full content-start">
                                            {COLOR_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => setFormData({ ...formData, color: opt.value })}
                                                    className={cn(
                                                        "h-8 w-8 rounded-full cursor-pointer hover:scale-110 transition-transform border border-transparent hover:border-gray-300",
                                                        opt.bg,
                                                        formData.color === opt.value ? "ring-2 ring-offset-2 ring-emerald-500 shadow-md" : ""
                                                    )}
                                                    title={opt.label}
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
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <Label>Tipo</Label>
                                        <Input
                                            placeholder="Ex: Necessidades básicas, Lazer..."
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {CATEGORY_TYPES.map(t => (
                                                <Badge
                                                    key={t}
                                                    variant={formData.type === t ? "default" : "outline"}
                                                    className={cn(
                                                        "cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-900/30 transition-colors",
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
                                        <Input
                                            placeholder="Ex: Despesa, Receita..."
                                            value={formData.classification}
                                            onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {CATEGORY_CLASSIFICATIONS.map(c => (
                                                <Badge
                                                    key={c}
                                                    variant={formData.classification === c ? "default" : "outline"}
                                                    className={cn(
                                                        "cursor-pointer hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-900/30 transition-colors",
                                                        formData.classification === c ? "bg-emerald-600 hover:bg-emerald-700" : ""
                                                    )}
                                                    onClick={() => setFormData({ ...formData, classification: c })}
                                                >
                                                    {c}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label htmlFor="desc">Descrição (Opcional)</Label>
                                    <Input
                                        id="desc"
                                        placeholder="Detalhes sobre a categoria..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => setView("list")}>Cancelar</Button>
                                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSave}>
                                        {editingId ? "Salvar Alterações" : "Criar Categoria"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            Object.keys(groupedCategories).length === 0 ? (
                                <div className="text-center py-10 text-gray-500">Nenhuma categoria encontrada.</div>
                            ) : (
                                Object.entries(groupedCategories).map(([type, categories]) => (
                                    <div key={type} className="mb-6">
                                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 sticky top-0 bg-white dark:bg-zinc-900 py-1 z-10">{type}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {categories.map((category) => {
                                                const Icon = category.icon
                                                const isSelected = category.name === currentCategory
                                                return (
                                                    <div
                                                        key={category.id}
                                                        className={cn(
                                                            "group flex items-start gap-4 p-3 rounded-lg border transition-all cursor-pointer relative",
                                                            isSelected
                                                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10"
                                                                : "border-gray-200 dark:border-zinc-800 hover:border-gray-300 dark:hover:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                                                        )}
                                                        onClick={() => handleSelect(category)}
                                                    >
                                                        <div className={cn(
                                                            "h-10 w-10 shrink-0 rounded-full flex items-center justify-center bg-gray-100 dark:bg-zinc-800 transition-colors",
                                                            category.color
                                                        )}>
                                                            <Icon className="h-5 w-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate pr-2">
                                                                    {category.name}
                                                                </span>
                                                                {isSelected && <Check className="h-4 w-4 text-emerald-600 shrink-0" />}
                                                            </div>
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed h-8">
                                                                {category.description || "Sem descrição"}
                                                            </div>
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <Badge variant="outline" className="text-[10px] bg-transparent border-gray-200 text-gray-500">
                                                                    {category.classification}
                                                                </Badge>
                                                                <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-gray-400 hover:text-blue-500"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleEditStart(category)
                                                                        }}
                                                                    >
                                                                        <Edit2 className="h-3 w-3" />
                                                                    </Button>
                                                                    {category.id !== "default" && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-6 w-6 text-gray-400 hover:text-red-500"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                handleDelete(category)
                                                                            }}
                                                                        >
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                </DialogContent>
            </Dialog>

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
        </>
    )
}
