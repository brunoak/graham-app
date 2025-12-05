export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            tenants: {
                Row: {
                    id: number
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: never
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: never
                    name?: string
                    created_at?: string
                }
            }
            users: {
                Row: {
                    id: string
                    tenant_id: number | null
                    full_name: string | null
                    email: string | null
                    avatar_url: string | null
                    created_at: string
                }
                Insert: {
                    id: string
                    tenant_id?: number | null
                    full_name?: string | null
                    email?: string | null
                    avatar_url?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    tenant_id?: number | null
                    full_name?: string | null
                    email?: string | null
                    avatar_url?: string | null
                    created_at?: string
                }
            }
            accounts: {
                Row: {
                    id: number
                    tenant_id: number
                    name: string
                    type: 'checking' | 'investment' | 'cash' | 'credit_card'
                    bank: string | null
                    initial_balance: number
                    current_balance: number
                    color: string | null
                    created_at: string
                }
                Insert: {
                    id?: never
                    tenant_id: number
                    name: string
                    type: 'checking' | 'investment' | 'cash' | 'credit_card'
                    bank?: string | null
                    initial_balance?: number
                    current_balance?: number
                    color?: string | null
                    created_at?: string
                }
                Update: {
                    id?: never
                    tenant_id?: number
                    name?: string
                    type?: 'checking' | 'investment' | 'cash' | 'credit_card'
                    bank?: string | null
                    initial_balance?: number
                    current_balance?: number
                    color?: string | null
                    created_at?: string
                }
            }
            categories: {
                Row: {
                    id: number
                    tenant_id: number
                    name: string
                    type: 'income' | 'expense'
                    parent_id: number | null
                    created_at: string
                }
                Insert: {
                    id?: never
                    tenant_id: number
                    name: string
                    type: 'income' | 'expense'
                    parent_id?: number | null
                    created_at?: string
                }
                Update: {
                    id?: never
                    tenant_id?: number
                    name?: string
                    type?: 'income' | 'expense'
                    parent_id?: number | null
                    created_at?: string
                }
            }
            goals: {
                Row: {
                    id: number
                    tenant_id: number
                    user_id: string | null
                    name: string
                    target_value: number
                    current_value: number
                    due_date: string | null
                    category_id: number | null
                    status: string | null
                    created_at: string
                }
                Insert: {
                    id?: never
                    tenant_id: number
                    user_id?: string | null
                    name: string
                    target_value: number
                    current_value?: number
                    due_date?: string | null
                    category_id?: number | null
                    status?: string | null
                    created_at?: string
                }
                Update: {
                    id?: never
                    tenant_id?: number
                    user_id?: string | null
                    name?: string
                    target_value?: number
                    current_value?: number
                    due_date?: string | null
                    category_id?: number | null
                    status?: string | null
                    created_at?: string
                }
            }
            transactions: {
                Row: {
                    id: number
                    tenant_id: number
                    user_id: string | null
                    account_id: number | null
                    category_id: number | null
                    goal_id: number | null
                    recurring_transaction_id: number | null
                    type: 'income' | 'expense' | 'transfer'
                    amount: number
                    date: string
                    description: string | null
                    is_recurring: boolean | null
                    parent_transaction_id: number | null
                    created_at: string
                }
                Insert: {
                    id?: never
                    tenant_id: number
                    user_id?: string | null
                    account_id?: number | null
                    category_id?: number | null
                    goal_id?: number | null
                    recurring_transaction_id?: number | null
                    type: 'income' | 'expense' | 'transfer'
                    amount: number
                    date: string
                    description?: string | null
                    is_recurring?: boolean | null
                    parent_transaction_id?: number | null
                    created_at?: string
                }
                Update: {
                    id?: never
                    tenant_id?: number
                    user_id?: string | null
                    account_id?: number | null
                    category_id?: number | null
                    goal_id?: number | null
                    recurring_transaction_id?: number | null
                    type?: 'income' | 'expense' | 'transfer'
                    amount?: number
                    date?: string
                    description?: string | null
                    is_recurring?: boolean | null
                    parent_transaction_id?: number | null
                    created_at?: string
                }
            }
            investment_assets: {
                Row: {
                    id: number
                    tenant_id: number
                    ticker: string
                    name: string | null
                    type: 'stock' | 'fii' | 'crypto' | 'fixed_income' | 'etf'
                    created_at: string
                }
                Insert: {
                    id?: never
                    tenant_id: number
                    ticker: string
                    name?: string | null
                    type: 'stock' | 'fii' | 'crypto' | 'fixed_income' | 'etf'
                    created_at?: string
                }
                Update: {
                    id?: never
                    tenant_id?: number
                    ticker?: string
                    name?: string | null
                    type?: 'stock' | 'fii' | 'crypto' | 'fixed_income' | 'etf'
                    created_at?: string
                }
            }
            investment_transactions: {
                Row: {
                    id: number
                    tenant_id: number
                    user_id: string | null
                    asset_id: number
                    account_id: number | null
                    type: 'buy' | 'sell' | 'dividend'
                    quantity: number
                    price: number
                    total_amount: number
                    date: string
                    created_at: string
                }
                Insert: {
                    id?: never
                    tenant_id: number
                    user_id?: string | null
                    asset_id: number
                    account_id?: number | null
                    type: 'buy' | 'sell' | 'dividend'
                    quantity: number
                    price: number
                    total_amount: number
                    date: string
                    created_at?: string
                }
                Update: {
                    id?: never
                    tenant_id?: number
                    user_id?: string | null
                    asset_id?: number
                    account_id?: number | null
                    type?: 'buy' | 'sell' | 'dividend'
                    quantity?: number
                    price?: number
                    total_amount?: number
                    date?: string
                    created_at?: string
                }
            }
            recurring_transactions: {
                Row: {
                    id: number
                    tenant_id: number
                    user_id: string | null
                    account_id: number | null
                    category_id: number | null
                    description: string | null
                    type: 'income' | 'expense' | 'transfer'
                    amount: number
                    start_date: string
                    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
                    occurrences: number | null
                    active: boolean | null
                    created_at: string
                }
                Insert: {
                    id?: never
                    tenant_id: number
                    user_id?: string | null
                    account_id?: number | null
                    category_id?: number | null
                    description?: string | null
                    type: 'income' | 'expense' | 'transfer'
                    amount: number
                    start_date: string
                    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
                    occurrences?: number | null
                    active?: boolean | null
                    created_at?: string
                }
                Update: {
                    id?: never
                    tenant_id?: number
                    user_id?: string | null
                    account_id?: number | null
                    category_id?: number | null
                    description?: string | null
                    type?: 'income' | 'expense' | 'transfer'
                    amount?: number
                    start_date?: string
                    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
                    occurrences?: number | null
                    active?: boolean | null
                    created_at?: string
                }
            }
            ia_history: {
                Row: {
                    id: number
                    tenant_id: number
                    user_id: string | null
                    question: string
                    answer: string
                    intent_tag: string | null
                    request_type: string | null
                    useful_response: boolean | null
                    user_feedback: string | null
                    context_json: Json | null
                    created_at: string
                }
                Insert: {
                    id?: never
                    tenant_id: number
                    user_id?: string | null
                    question: string
                    answer: string
                    intent_tag?: string | null
                    request_type?: string | null
                    useful_response?: boolean | null
                    user_feedback?: string | null
                    context_json?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: never
                    tenant_id?: number
                    user_id?: string | null
                    question?: string
                    answer?: string
                    intent_tag?: string | null
                    request_type?: string | null
                    useful_response?: boolean | null
                    user_feedback?: string | null
                    context_json?: Json | null
                    created_at?: string
                }
            }
            tax_report_history: {
                Row: {
                    id: number
                    tenant_id: number
                    user_id: string | null
                    year: number
                    report_type: string
                    report_json: Json | null
                    status: string | null
                    generated_at: string
                }
                Insert: {
                    id?: never
                    tenant_id: number
                    user_id?: string | null
                    year: number
                    report_type: string
                    report_json?: Json | null
                    status?: string | null
                    generated_at?: string
                }
                Update: {
                    id?: never
                    tenant_id?: number
                    user_id?: string | null
                    year?: number
                    report_type?: string
                    report_json?: Json | null
                    status?: string | null
                    generated_at?: string
                }
            }
        }
    }
}
