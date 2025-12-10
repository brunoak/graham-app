-- Create categories table
DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE categories (
    id TEXT PRIMARY KEY, 
    -- Error indicated tenant_id mismatch (uuid vs bigint). 
    -- Assuming tenants(id) is BIGINT based on error message.
    tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- 'Necessidades básicas', etc.
    classification TEXT NOT NULL, -- 'Despesa', 'Receita'
    icon TEXT NOT NULL, -- 'Droplets', 'Home' (Lucide icon name)
    color TEXT, -- Tailwind class
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Policy: Read
-- Users can read defaults OR their own tenant's categories
CREATE POLICY "Users can view default and their own categories" ON categories
    FOR SELECT
    USING (
        is_default = true 
        OR 
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- Policy: Insert
-- Users can create their own categories
CREATE POLICY "Users can create their own categories" ON categories
    FOR INSERT
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- Policy: Update
-- Users can update their own categories
CREATE POLICY "Users can update their own categories" ON categories
    FOR UPDATE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );

-- Policy: Delete
-- Users can delete their own categories
CREATE POLICY "Users can delete their own categories" ON categories
    FOR DELETE
    USING (
        tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
    );


-- SEED DATA (Defaults)
-- Defaults have NULL tenant_id (system wide? or specific tenant?)
-- If tenant_id references tenants(id), can it be NULL?
-- Schema usually allows NULL if not defined NOT NULL.
-- But if RLS checks tenant_id, defaults need careful handling.
-- The Read policy allows is_default=true OR matching tenant.
-- So tenant_id can be NULL for defaults.
INSERT INTO categories (id, name, type, classification, icon, color, is_default, description) VALUES
('agua', 'Água', 'Necessidades básicas', 'Despesa', 'Droplets', 'text-blue-500', true, NULL),
('aluguel', 'Aluguel', 'Necessidades básicas', 'Despesa', 'Home', 'text-orange-500', true, NULL),
('seguro_vida', 'Seguro de vida', 'Necessidades básicas', 'Despesa', 'Heart', 'text-red-500', true, NULL),
('supermercado', 'Supermercado', 'Necessidades básicas', 'Despesa', 'ShoppingCart', 'text-emerald-500', true, NULL),
('cartao_credito', 'Cartão de Crédito', 'Necessidades básicas', 'Despesa', 'CreditCard', 'text-purple-500', true, 'Custos cartão de crédito'),
('celular', 'Celular', 'Necessidades básicas', 'Despesa', 'Smartphone', 'text-sky-500', true, 'Plano de telefonia; Crédito celular'),
('condominio', 'Condomínio', 'Necessidades básicas', 'Despesa', 'Building', 'text-gray-500', true, NULL),
('escolas', 'Escolas (filhos)', 'Necessidades básicas', 'Despesa', 'GraduationCap', 'text-indigo-500', true, 'Mensalidade / Material escolar'),
('internet', 'Internet', 'Necessidades básicas', 'Despesa', 'Wifi', 'text-cyan-500', true, NULL),
('energia', 'Energia', 'Necessidades básicas', 'Despesa', 'Zap', 'text-yellow-500', true, NULL),
('saude', 'Saúde', 'Necessidades básicas', 'Despesa', 'Activity', 'text-red-400', true, 'Academia; Consulta médica; Consulta dentista; Remédios'),
('plano_saude', 'Plano de saúde', 'Necessidades básicas', 'Despesa', 'Stethoscope', 'text-teal-500', true, NULL),
('transporte', 'Transporte', 'Necessidades básicas', 'Despesa', 'Bus', 'text-blue-600', true, 'Passagem de ônibus; Combustível; Seguro; Revisão'),
('emprestimo', 'Empréstimo', 'Necessidades básicas', 'Despesa', 'Banknote', 'text-green-700', true, 'Dinheiro emprestado (curto prazo)'),
('extras_casa', 'Extras (Casa)', 'Necessidades básicas', 'Despesa', 'Wrench', 'text-orange-400', true, 'Despesas extras da casa que não são recorrentes'),
('outros_basicos', 'Outros (Necessidades básicas)', 'Necessidades básicas', 'Despesa', 'MoreHorizontal', 'text-gray-400', true, NULL),
('alimentacao_extra', 'Alimentação (Gastos extras)', 'Lazer', 'Despesa', 'Utensils', 'text-orange-500', true, 'Almoço em restaurantes, lanches, pizzas'),
('assinaturas', 'Assinaturas Mensais', 'Lazer', 'Despesa', 'MonitorPlay', 'text-purple-600', true, 'TV a cabo, NETFLIX, Spotify, Amazon Prime'),
('entretenimento', 'Entretenimento mensal', 'Lazer', 'Despesa', 'PartyPopper', 'text-pink-500', true, 'Bares, festas, confraternizações'),
('outros_lazer', 'Outros (lazer)', 'Lazer', 'Despesa', 'MoreHorizontal', 'text-gray-400', true, 'Outros gastos relacionados ao lazer'),
('educacao', 'Educação', 'Educação', 'Despesa', 'BookOpen', 'text-blue-500', true, 'Cursos, livros'),
('longo_prazo', 'Longo prazo', 'Longo Prazo', 'Despesa Futura', 'PiggyBank', 'text-emerald-600', true, 'Troca de carro; Compra de casa própria; Faculdade'),
('liberdade_financeira', 'Liberdade Financeira', 'Investimentos', 'Investimentos', 'TrendingUp', 'text-green-500', true, 'Renda variável, caixa de oportunidade'),
('reserva_emergencia', 'Reserva de Emergência', 'Investimentos', 'Investimentos', 'ShieldCheck', 'text-blue-600', true, 'Dinheiro guardado para emergências (6 meses)'),
('outros_renda', 'Outros (Renda)', 'Receitas', 'Receita', 'Wallet', 'text-green-500', true, '13º, PLR, Renda Extra'),
('salario', 'Salário', 'Receitas', 'Receita', 'DollarSign', 'text-emerald-500', true, 'Salários'),
('default', 'Outros', 'Necessidades básicas', 'Despesa', 'MoreHorizontal', 'text-gray-400', true, NULL)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    classification = EXCLUDED.classification,
    icon = EXCLUDED.icon,
    color = EXCLUDED.color,
    description = EXCLUDED.description;
