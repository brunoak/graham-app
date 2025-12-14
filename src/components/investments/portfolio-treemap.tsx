"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, Treemap, Tooltip as RechartsTooltip } from 'recharts'
import { useTheme } from "next-themes"
import { HelpCircle } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Asset } from "@/lib/schemas/investment-schema"

const USD_BRL_RATE = 5.50

interface PortfolioTreemapProps {
    currency?: "BRL" | "USD"
    assets?: Asset[]
}

export function PortfolioTreemap({ currency = "BRL", assets = [] }: PortfolioTreemapProps) {
    const { theme } = useTheme()

    // DATA TRANSFORMATION LOGIC
    // 1. Calculate values based on selected currency
    // 2. Group by type seems unnecessary for the visual requested (just boxes), 
    //    but Recharts requires a tree. We will use a single "Root" for simplicity 
    //    to maximize space usage, or group by Type if desired. 
    //    Let's stick to a flat list under "Portfolio" so boxes sort purely by size.

    const processedAssets = assets.map(asset => {
        // Fallback for current price (using average price -> 0 profit)
        let price = asset.price || asset.average_price
        let avgPrice = asset.average_price

        // Currency Conversion
        const assetCurrency = asset.currency || 'BRL'
        if (currency === "BRL" && assetCurrency === "USD") {
            price *= USD_BRL_RATE
            avgPrice *= USD_BRL_RATE
        } else if (currency === "USD" && assetCurrency === "BRL") {
            price /= USD_BRL_RATE
            avgPrice /= USD_BRL_RATE
        }

        const totalValue = asset.quantity * price
        // Avoid division by zero
        const changePercent = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0

        return {
            name: asset.ticker, // Display Name
            ticker: asset.ticker,
            full_name: asset.name,
            size: totalValue, // Box Size matches Total Value which matches Portfolio %
            price: price,
            change: parseFloat(changePercent.toFixed(2)),
            type: asset.type
        }
    }).filter(a => a.size > 0) // Remove empty positions

    const isEmpty = assets.length === 0

    let activeAssets = processedAssets

    if (isEmpty) {
        activeAssets = [
            { name: "P1", size: 50000, type: 'placeholder', ticker: "", price: 0, change: 0, full_name: "" },
            { name: "P2", size: 30000, type: 'placeholder', ticker: "", price: 0, change: 0, full_name: "" },
            { name: "P3", size: 15000, type: 'placeholder', ticker: "", price: 0, change: 0, full_name: "" },
            { name: "P4", size: 10000, type: 'placeholder', ticker: "", price: 0, change: 0, full_name: "" },
            { name: "P5", size: 5000, type: 'placeholder', ticker: "", price: 0, change: 0, full_name: "" },
        ] as any
    }

    // Calculate Total Portfolio Value for % calculation
    const totalPortfolioValue = activeAssets.reduce((acc, curr) => acc + curr.size, 0)

    // Prepare Data for Recharts
    const data = [
        {
            name: 'Portfolio',
            children: activeAssets
        }
    ]

    const formatCurrency = (val: number) => new Intl.NumberFormat(currency === 'BRL' ? 'pt-BR' : 'en-US', { style: 'currency', currency: currency }).format(val)

    return (
        <Card className="col-span-12 border-gray-100 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Mapa dos Ativos</CardTitle>
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="cursor-default">
                                    <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-500 transition-colors" />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Quanto maior a % do ativo na carteira, maior é o quadrado</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </CardHeader>
            <CardContent className="h-[400px] p-0">
                <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                        data={data}
                        dataKey="size"
                        aspectRatio={4 / 3}
                        stroke="#fff"
                        isAnimationActive={!isEmpty}
                        content={<CustomTreeMapContent formatCurrency={formatCurrency} totalValue={totalPortfolioValue} />}
                    >
                        {!isEmpty && <RechartsTooltip content={<CustomTooltip formatCurrency={formatCurrency} totalValue={totalPortfolioValue} />} />}
                    </Treemap>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

// TOOLTIP COMPONENT (Standardized Fonts)
const CustomTooltip = (props: any) => {
    const { active, payload, formatCurrency, totalValue } = props;
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        // Logic to find 'change' and 'size'
        let change = data.change;
        if (typeof change === 'undefined') change = data.v; // Fallback

        let size = data.size;
        if (typeof size === 'undefined') size = data.value;

        // Share calculation (approximate if not passed, but usually is)
        const share = ((size / totalValue) * 100).toFixed(2);

        return (
            <div className="bg-white dark:bg-zinc-900 p-3 border border-gray-200 dark:border-zinc-800 shadow-lg rounded-lg min-w-[180px]">
                <div className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-zinc-800 pb-1 mb-2">
                    {data.full_name || data.name}
                </div>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center gap-4">
                        <span className="text-gray-500 font-normal">Preço:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium"> {/* Changed from font-bold to font-medium */}
                            {formatCurrency(data.price)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                        <span className="text-gray-500 font-normal">Variação:</span>
                        <span className={`font-medium ${change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}> {/* font-medium */}
                            {change > 0 ? '+' : ''}{change}%
                        </span>
                    </div>
                    <div className="flex justify-between items-center gap-4">
                        <span className="text-gray-500 font-normal">Posição:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium"> {/* font-medium */}
                            {formatCurrency(size)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center gap-4 border-t border-gray-100 dark:border-zinc-800 pt-1 mt-1">
                        <span className="text-gray-500 font-normal">Carteira:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">{share}%</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const CustomTreeMapContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name, children, formatCurrency, totalValue, type } = props

    // LOGIC: Leaf detection (Asset)
    const isLeaf = !children || children.length === 0;

    // DATA ACCESS
    const rawData = payload || props;
    const assetType = rawData.type || props.type; // Access Type

    // CHECK PLACEHOLDER
    if (assetType === 'placeholder') {
        return (
            <g>
                <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    style={{
                        fill: '#e5e7eb', // Gray-200
                        stroke: '#fff',
                        strokeWidth: 2,
                        shapeRendering: 'crispEdges'
                    }}
                    className="animate-pulse dark:fill-zinc-800"
                />
            </g>
        )
    }

    let change = rawData.change;
    if (typeof change === 'undefined') change = props.change;

    const ticker = rawData.ticker || props.ticker || rawData.name;
    const price = rawData.price || props.price;
    const size = rawData.size || props.size;

    // Validate
    const hasChange = typeof change !== 'undefined' && change !== null;
    const isPositive = hasChange && change >= 0;
    const isNeutral = hasChange && Math.abs(change) < 0.01;

    // 🎨 COLOR LOGIC
    let bgColor = '#6b7280'; // Default Gray
    let textColor = '#fff';

    if (isLeaf) {
        // Semantic Coloring
        if (assetType === 'fixed_income' || assetType === 'treasure') {
            bgColor = '#6b7280'; // Gray-500 for Fixed Income/Treasury
        } else if (hasChange) {
            // Variable Income (Stocks, FIIs, Crypto, ETFs)
            if (isNeutral) bgColor = '#6b7280';
            else if (isPositive) bgColor = '#10b981'; // Emerald-500
            else bgColor = '#ef4444'; // Red-500
        } else {
            // Fallback
            bgColor = '#6b7280';
        }
    } else {
        bgColor = '#ffffff';
        textColor = '#000';
    }

    // Share Calculation
    const shareRaw = (size / totalValue) * 100;
    const share = shareRaw.toFixed(1) + '%';
    const formattedPrice = formatCurrency(price);
    const formattedChange = hasChange ? (change > 0 ? '+' : '') + change + '%' : '-';

    // PARENT RENDERING (Hidden)
    if (!isLeaf) return null;

    // LAYOUT & RENDERING
    // We use <foreignObject> to render HTML text effectively.
    // This solves the "blurry text" issue by using the browser's HTML rendering engine instead of SVG text.
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: bgColor,
                    stroke: '#fff',
                    strokeWidth: 2,
                    shapeRendering: 'crispEdges'
                }}
            />

            <foreignObject x={x} y={y} width={width} height={height}>
                <div
                    className="h-full w-full p-2 flex flex-col text-white antialiased overflow-hidden pointer-events-none"
                    style={{ fontFamily: 'Inter, sans-serif' }} // Enforcing font consistency
                >
                    {/* STACK: STRICT TOP-LEFT ALIGNMENT (No mt-auto) */}

                    {/* 1. Header: Ticker & Name */}
                    {width > 60 && height > 40 && (
                        <div className="flex flex-col mb-1.5"> {/* Just margin-bottom */}
                            <span className="text-sm font-bold leading-none tracking-tight">
                                {ticker}
                            </span>
                            {width > 120 && height > 80 && (
                                <span className="text-[10px] font-normal opacity-90 truncate mt-0.5">
                                    {rawData.full_name?.split(' ')[0]}
                                </span>
                            )}
                        </div>
                    )}

                    {/* 2. Price */}
                    {width > 100 && height > 60 && (
                        <div className="mb-1.5">
                            <span className="text-xs font-medium opacity-95 block leading-none">
                                {formattedPrice}
                            </span>
                        </div>
                    )}

                    {/* 3. Stats Stack (Variation & Share) */}
                    {height > 100 && width > 100 && (
                        <div className="flex flex-col gap-1.5">
                            {/* Variation */}
                            <div>
                                <span className="text-[9px] uppercase opacity-75 font-medium block leading-none mb-0.5">
                                    Variação
                                </span>
                                <span className="text-xs font-semibold leading-none">
                                    {formattedChange}
                                </span>
                            </div>

                            {/* Share */}
                            {height > 140 && (
                                <div>
                                    <span className="text-[9px] uppercase opacity-75 font-medium block leading-none mb-0.5">
                                        Part.
                                    </span>
                                    <span className="text-xs font-semibold leading-none">
                                        {share}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tiny Tile Fallback (Just Ticker Centered) */}
                    {!(width > 60 && height > 40) && width > 30 && height > 20 && (
                        <div className="h-full w-full flex items-center justify-center">
                            <span className="text-[10px] font-bold leading-none tracking-tight">
                                {ticker}
                            </span>
                        </div>
                    )}
                </div>
            </foreignObject>
        </g>
    )
}


