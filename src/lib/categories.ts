
import {
    Droplets,
    Home,
    Heart,
    ShoppingCart,
    CreditCard,
    Smartphone,
    Building,
    GraduationCap,
    Wifi,
    Zap,
    Activity,
    Stethoscope,
    Bus,
    Banknote,
    Wrench,
    MoreHorizontal,
    Utensils,
    MonitorPlay,
    PartyPopper,
    BookOpen,
    PiggyBank,
    TrendingUp,
    ShieldCheck,
    Wallet,
    DollarSign,
    Briefcase,
    Car, Plane, Gift, Dumbbell, Coffee, Music, Camera, Gamepad2, Laptop, Lightbulb,
    Hammer, Scissors, Baby, Dog, Shirt, Watch, Sun, Moon, CloudRain, Umbrella,
    Ticket, MapPin, Flag, Star, Trophy, Crown, Sparkles, Archive, Bell,
    type LucideIcon
} from "lucide-react"

export type CategoryClassification = "Despesa" | "Receita" | "Investimentos" | "Despesa Futura" | "Educação" | "Lazer" | string
export type CategoryType = "Necessidades básicas" | "Lazer" | "Educação" | "Longo Prazo" | "Investimentos" | "Receitas" | string

export interface Category {
    id: string
    name: string
    description?: string
    type: CategoryType
    classification: CategoryClassification
    icon: LucideIcon
    color: string // Tailwind text color class for preview
}

export const CATEGORIES: Category[] = [
    // Necessidades Básicas
    { id: "agua", name: "Água", type: "Necessidades básicas", classification: "Despesa", icon: Droplets, color: "text-blue-500" },
    { id: "aluguel", name: "Aluguel", type: "Necessidades básicas", classification: "Despesa", icon: Home, color: "text-orange-500" },
    { id: "seguro_vida", name: "Seguro de vida", type: "Necessidades básicas", classification: "Despesa", icon: Heart, color: "text-red-500" },
    { id: "supermercado", name: "Supermercado", type: "Necessidades básicas", classification: "Despesa", icon: ShoppingCart, color: "text-emerald-500" },
    { id: "cartao_credito", name: "Cartão de Crédito", description: "Custos cartão de crédito", type: "Necessidades básicas", classification: "Despesa", icon: CreditCard, color: "text-purple-500" },
    { id: "celular", name: "Celular", description: "Plano de telefonia; Crédito celular", type: "Necessidades básicas", classification: "Despesa", icon: Smartphone, color: "text-sky-500" },
    { id: "condominio", name: "Condomínio", type: "Necessidades básicas", classification: "Despesa", icon: Building, color: "text-gray-500" },
    { id: "escolas", name: "Escolas (filhos)", description: "Mensalidade / Material escolar", type: "Necessidades básicas", classification: "Despesa", icon: GraduationCap, color: "text-indigo-500" },
    { id: "internet", name: "Internet", type: "Necessidades básicas", classification: "Despesa", icon: Wifi, color: "text-cyan-500" },
    { id: "energia", name: "Energia", type: "Necessidades básicas", classification: "Despesa", icon: Zap, color: "text-yellow-500" },
    { id: "saude", name: "Saúde", description: "Academia; Consulta médica; Consulta dentista; Remédios", type: "Necessidades básicas", classification: "Despesa", icon: Activity, color: "text-red-400" },
    { id: "plano_saude", name: "Plano de saúde", type: "Necessidades básicas", classification: "Despesa", icon: Stethoscope, color: "text-teal-500" },
    { id: "transporte", name: "Transporte", description: "Passagem de ônibus; Combustível; Seguro; Revisão", type: "Necessidades básicas", classification: "Despesa", icon: Bus, color: "text-blue-600" },
    { id: "emprestimo", name: "Empréstimo", description: "Dinheiro emprestado (curto prazo)", type: "Necessidades básicas", classification: "Despesa", icon: Banknote, color: "text-green-700" },
    { id: "extras_casa", name: "Extras (Casa)", description: "Despesas extras da casa que não são recorrentes", type: "Necessidades básicas", classification: "Despesa", icon: Wrench, color: "text-orange-400" },
    { id: "outros_basicos", name: "Outros (Necessidades básicas)", type: "Necessidades básicas", classification: "Despesa", icon: MoreHorizontal, color: "text-gray-400" },

    // Lazer
    { id: "alimentacao_extra", name: "Alimentação (Gastos extras)", description: "Almoço em restaurantes, lanches, pizzas", type: "Lazer", classification: "Despesa", icon: Utensils, color: "text-orange-500" },
    { id: "assinaturas", name: "Assinaturas Mensais", description: "TV a cabo, NETFLIX, Spotify, Amazon Prime", type: "Lazer", classification: "Despesa", icon: MonitorPlay, color: "text-purple-600" },
    { id: "entretenimento", name: "Entretenimento mensal", description: "Bares, festas, confraternizações", type: "Lazer", classification: "Despesa", icon: PartyPopper, color: "text-pink-500" },
    { id: "outros_lazer", name: "Outros (lazer)", description: "Outros gastos relacionados ao lazer", type: "Lazer", classification: "Despesa", icon: MoreHorizontal, color: "text-gray-400" },

    // Educação
    { id: "educacao", name: "Educação", description: "Cursos, livros", type: "Educação", classification: "Despesa", icon: BookOpen, color: "text-blue-500" },

    // Longo Prazo
    { id: "longo_prazo", name: "Longo prazo", description: "Troca de carro; Compra de casa própria; Faculdade", type: "Longo Prazo", classification: "Despesa Futura", icon: PiggyBank, color: "text-emerald-600" },

    // Investimentos
    { id: "liberdade_financeira", name: "Liberdade Financeira", description: "Renda variável, caixa de oportunidade", type: "Investimentos", classification: "Investimentos", icon: TrendingUp, color: "text-green-500" },
    { id: "reserva_emergencia", name: "Reserva de Emergência", description: "Dinheiro guardado para emergências (6 meses)", type: "Investimentos", classification: "Investimentos", icon: ShieldCheck, color: "text-blue-600" },

    // Receitas
    { id: "outros_renda", name: "Outros (Renda)", description: "13º, PLR, Renda Extra", type: "Receitas", classification: "Receita", icon: Wallet, color: "text-green-500" },
    { id: "salario", name: "Salário", description: "Salários", type: "Receitas", classification: "Receita", icon: DollarSign, color: "text-emerald-500" },

    // Default fallback
    { id: "default", name: "Outros", type: "Necessidades básicas", classification: "Despesa", icon: MoreHorizontal, color: "text-gray-400" }
]

export function getCategoryById(id: string): Category {
    return CATEGORIES.find(c => c.id === id) || CATEGORIES.find(c => c.id === "default") || {
        id: "gen_fallback", name: "Categoria", type: "Necessidades básicas", classification: "Despesa", icon: MoreHorizontal, color: "text-gray-500"
    }
}

export function getCategoryByName(name: string): Category {
    // Simple fuzzy match or direct match
    const normalize = (s: string) => s && typeof s === 'string' ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : ""
    const normalizedName = normalize(name)

    return CATEGORIES.find(c => normalize(c.name) === normalizedName) || CATEGORIES.find(c => c.id === "default") || {
        id: "gen_fallback", name: "Categoria", type: "Necessidades básicas", classification: "Despesa", icon: MoreHorizontal, color: "text-gray-500"
    }
}


export const CATEGORY_TYPES: CategoryType[] = [
    "Necessidades básicas", "Lazer", "Educação", "Longo Prazo", "Investimentos", "Receitas"
]

export const CATEGORY_CLASSIFICATIONS: CategoryClassification[] = [
    "Despesa", "Receita", "Investimentos", "Despesa Futura", "Educação", "Lazer"
]

// Expose icons for picker
export const AVAILABLE_ICONS = {
    // Basic
    Droplets, Home, Heart, ShoppingCart, CreditCard, Smartphone, Building, GraduationCap, Wifi, Zap,
    Activity, Stethoscope, Bus, Banknote, Wrench, MoreHorizontal, Utensils, MonitorPlay, PartyPopper,
    BookOpen, PiggyBank, TrendingUp, ShieldCheck, Wallet, DollarSign, Briefcase,
    // Additions
    Car, Plane, Gift, Dumbbell, Coffee, Music, Camera, Gamepad2, Laptop, Lightbulb,
    Hammer, Scissors, Baby, Dog, Shirt, Watch, Sun, Moon, CloudRain, Umbrella,
    Ticket, MapPin, Flag, Star, Trophy, Crown, Sparkles, Archive, Bell
}

// Explicit Color Options for Picker (label, text class, bg class for picker preview)
export const COLOR_OPTIONS = [
    { label: "Cinza", value: "text-gray-500", bg: "bg-gray-500" },
    { label: "Vermelho", value: "text-red-500", bg: "bg-red-500" },
    { label: "Laranja", value: "text-orange-500", bg: "bg-orange-500" },
    { label: "Amarelo", value: "text-yellow-500", bg: "bg-yellow-500" },
    { label: "Verde", value: "text-green-500", bg: "bg-green-500" },
    { label: "Esmeralda", value: "text-emerald-500", bg: "bg-emerald-500" },
    { label: "Teal", value: "text-teal-500", bg: "bg-teal-500" },
    { label: "Ciano", value: "text-cyan-500", bg: "bg-cyan-500" },
    { label: "Azul", value: "text-blue-500", bg: "bg-blue-500" },
    { label: "Índigo", value: "text-indigo-500", bg: "bg-indigo-500" },
    { label: "Roxo", value: "text-purple-500", bg: "bg-purple-500" },
    { label: "Rosa", value: "text-pink-500", bg: "bg-pink-500" },
    { label: "Rose", value: "text-rose-500", bg: "bg-rose-500" },
    { label: "Preto", value: "text-gray-900", bg: "bg-gray-900" },
]


export function addCategory(category: Category) {
    CATEGORIES.push(category)
}

export function removeCategory(categoryId: string) {
    if (categoryId === "default") return // Prevent deleting default category

    const index = CATEGORIES.findIndex(c => c.id === categoryId)
    if (index !== -1) {
        CATEGORIES.splice(index, 1)
    }
}
