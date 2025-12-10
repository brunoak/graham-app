
import { useState } from "react"
import { getCategoryByName, AVAILABLE_ICONS } from "@/lib/categories" // Import AVAILABLE_ICONS
import { cn } from "@/lib/utils"
import { CategorySelectionDialog } from "./category-selection-dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CategoryBadgeProps {
    categoryName: string
    transactionId?: number | string
    onUpdate?: (newCategory: any) => void
    size?: "sm" | "md"
    interactive?: boolean
    // New Props for Dynamic Data
    iconName?: string
    color?: string
}

export function CategoryBadge({ categoryName, onUpdate, size = "md", interactive = true, iconName, color }: CategoryBadgeProps) {
    const [isTooltipOpen, setIsTooltipOpen] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const category = getCategoryByName(categoryName)

    // Resolve Icon: Use prop if available (DB dynamic), else fallback to static lookup
    const Icon = iconName
        ? (AVAILABLE_ICONS[iconName as keyof typeof AVAILABLE_ICONS] || AVAILABLE_ICONS.MoreHorizontal)
        : category.icon

    // Resolve Color
    const displayColor = color || category.color

    // Fallback description if none exists
    const description = category.description

    const TriggerContent = (
        <button
            type="button"
            className={cn(
                "rounded-full flex items-center justify-center transition-transform focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
                "bg-gray-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border border-transparent hover:border-gray-200 dark:hover:border-zinc-700 hover:shadow-sm",
                interactive ? "hover:scale-105 active:scale-95 cursor-pointer" : "cursor-default",
                size === "sm" ? "h-8 w-8" : "h-10 w-10"
            )}
            onClick={(e) => {
                if (interactive) {
                    setIsTooltipOpen(false)
                }
            }}
        >
            <Icon
                strokeWidth={1.5}
                className={cn(
                    displayColor,
                    size === "sm" ? "h-4 w-4" : "h-5 w-5"
                )}
            />
        </button>
    )

    return (
        <Popover open={isTooltipOpen && !isDialogOpen} onOpenChange={setIsTooltipOpen}>
            <PopoverTrigger asChild>
                <div
                    className="relative inline-flex"
                    onMouseEnter={() => !isDialogOpen && setIsTooltipOpen(true)}
                    onMouseLeave={() => setIsTooltipOpen(false)}
                >
                    {/* Trigger / Icon with Selection Dialog if interactive */}
                    {interactive ? (
                        <CategorySelectionDialog
                            currentCategory={categoryName}
                            onSelect={(newCat) => onUpdate?.(newCat)}
                            onOpenChange={(open) => {
                                setIsDialogOpen(open)
                                if (open) setIsTooltipOpen(false)
                            }}
                        >
                            {TriggerContent}
                        </CategorySelectionDialog>
                    ) : (
                        TriggerContent
                    )}
                </div>
            </PopoverTrigger>

            {/* Custom Tooltip via Popover Portal */}
            <PopoverContent
                side="bottom"
                align="center"
                className="w-auto min-w-[200px] p-3 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 duration-200 border-none shadow-xl bg-white dark:bg-zinc-900 pointer-events-none"
                onMouseEnter={() => setIsTooltipOpen(true)}
                onMouseLeave={() => setIsTooltipOpen(false)}
            >
                {/* Visual Arrow */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-[6px] w-3 h-3 rotate-45 bg-white dark:bg-zinc-900 shadow-[-1px_-1px_0_0_rgba(0,0,0,0.05)]" />

                <div className="flex flex-col gap-1 text-center relative z-10">
                    <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 leading-tight">
                        {category.name}
                    </span>

                    {/* Show Type if it's not the generic default. */}
                    {category.type && category.id !== "default" && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full mx-auto">
                            {category.type}
                        </span>
                    )}

                    {description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-normal mt-1 border-t border-gray-100 dark:border-zinc-800 pt-1">
                            {description.split(';').map((desc, i) => (
                                <div key={i} className="leading-snug">{desc.trim()}</div>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
