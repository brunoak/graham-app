import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ChartSkeletonProps {
    className?: string
    mode?: "loading" | "empty"
    message?: string
    type?: "bar" | "area"
    variant?: "full" | "content" // 'full' = Card wrapper, 'content' = pure visual
}

export function ChartSkeleton({
    className,
    mode = "loading",
    message = "Ainda não há dados para exibir",
    type = "bar",
    variant = "full"
}: ChartSkeletonProps) {
    const isLoading = mode === "loading"

    const SkeletonContent = () => (
        <div className={cn("w-full h-full relative overflow-hidden", variant === "content" ? className : "")}>
            {/* Background Grid/Structure */}
            <div className="w-full h-full flex flex-col justify-between py-2 opacity-30">
                {[1, 2, 3, 4, 5].map((_, i) => (
                    <div key={i} className="w-full h-[1px] bg-gray-200 dark:bg-zinc-800" />
                ))}
            </div>

            {/* Visuals: Bar or Area */}
            <div className="absolute inset-0 flex items-end justify-between px-2 pb-0">
                {type === "bar" ? (
                    // Bar Visuals
                    <div className="w-full h-full flex items-end justify-between gap-2 opacity-50">
                        {[40, 70, 45, 90, 60, 80, 50, 75, 65, 85, 95, 60].map((height, i) => (
                            <div
                                key={i}
                                style={{ height: `${height}%` }}
                                className={cn(
                                    "w-full rounded-t-md",
                                    isLoading
                                        ? "bg-gray-200 dark:bg-zinc-800 animate-pulse"
                                        : "bg-gray-100 dark:bg-zinc-800/40"
                                )}
                            />
                        ))}
                    </div>
                ) : (
                    // Area Visuals (SVG Curve)
                    <div className="absolute inset-0 flex items-end opacity-40">
                        {isLoading ? (
                            <Skeleton className="w-full h-2/3 bg-gray-100 dark:bg-zinc-800/50 rounded-t-[40%]" />
                        ) : (
                            // "Ghost Curve" SVG for Empty State
                            <svg viewBox="0 0 100 40" className="w-full h-full shrink-0" preserveAspectRatio="none">
                                <path
                                    d="M0 40 L0 30 C 10 25, 20 35, 30 20 C 40 5, 50 35, 60 25 C 70 15, 80 5, 90 20 C 95 28, 100 25, 100 25 L 100 40 Z"
                                    className="fill-gray-100 dark:fill-zinc-800/40"
                                />
                            </svg>
                        )}
                    </div>
                )}
            </div>

            {/* Empty State Overlay */}
            {!isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
                    <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm px-6 py-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {message}
                        </span>
                    </div>
                </div>
            )}
        </div>
    )

    if (variant === "content") {
        return <SkeletonContent />
    }

    // Default "Full" Variant with Card Wrapper
    return (
        <Card className={cn("bg-white dark:bg-zinc-900 border-none shadow-sm shadow-gray-200 dark:shadow-none flex flex-col h-full min-h-[400px]", className)}>
            <CardHeader className="flex flex-row items-center justify-between pb-8">
                {isLoading ? (
                    <Skeleton className="h-6 w-32 bg-gray-200 dark:bg-zinc-800" />
                ) : (
                    <div className="h-6 w-32 bg-gray-100 dark:bg-zinc-800/50 rounded-md" />
                )}
                <div className="flex gap-1">
                    {isLoading ? (
                        <>
                            <Skeleton className="h-6 w-20 bg-gray-200 dark:bg-zinc-800" />
                            <Skeleton className="h-6 w-20 bg-gray-200 dark:bg-zinc-800" />
                        </>
                    ) : (
                        <div className="flex gap-1">
                            <div className="h-6 w-20 bg-gray-100 dark:bg-zinc-800/50 rounded-md opacity-50" />
                            <div className="h-6 w-20 bg-gray-100 dark:bg-zinc-800/50 rounded-md opacity-50" />
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 px-6 pb-6 relative overflow-hidden">
                <SkeletonContent />
            </CardContent>
        </Card>
    )
}
