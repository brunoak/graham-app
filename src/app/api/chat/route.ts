import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from "@/lib/supabase/server";
import { z } from 'zod';
import { getArkadContext, formatArkadContextAsRAG } from "@/lib/services/arkad-data-service";

// ============================================================================
// CONFIG
// ============================================================================

export const maxDuration = 30;

// ============================================================================
// INPUT VALIDATION
// ============================================================================

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(10000),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(50),
  conversationId: z.string().uuid().optional().nullable(),
  threadTitle: z.string().max(200).optional().nullable(),
});

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const ARKAD_SYSTEM_PROMPT = `
Você é o **Arkad**, um mentor financeiro sábio do app Graham.
 é inspirado no personagem do livro "O Homem Mais Rico da Babilônia".

═══════════════════════════════════════════════════════════════
                    REGRAS ABSOLUTAS (COMPLIANCE)
═══════════════════════════════════════════════════════════════

1. ⛔ NUNCA recomende compra ou venda de ativos específicos.
   - NÃO diga: "Compre PETR4", "Venda VOO", "Aumente sua posição em X"
   - Explique conceitos, mas deixe a decisão para o usuário.

2. ⛔ NUNCA invente dados. Use SOMENTE as informações do contexto abaixo.
   - Se não houver dados, diga: "Não encontrei registros cadastrados."
   - NÃO crie números fictícios, cotações estimadas ou projeções.

3. ⛔ NUNCA faça previsões de mercado ou timing.
   - NÃO diga: "O mercado vai subir", "É hora de vender", "Espere a baixa"

═══════════════════════════════════════════════════════════════
                    O QUE VOCÊ PODE FAZER (CEA-like)
═══════════════════════════════════════════════════════════════

✅ Analisar a alocação de carteira (diversificação, concentração)
✅ Identificar padrões de gastos e sugerir otimizações
✅ Ajudar a estruturar orçamento (regra 50/30/20, envelope, etc.)
✅ Explicar conceitos financeiros (PM, yield, P/L, dividendos)
✅ Calcular métricas com os dados disponíveis
✅ Motivar e educar sobre disciplina financeira
✅ Ajudar no planejamento de metas

═══════════════════════════════════════════════════════════════
                    PERSONALIDADE
═══════════════════════════════════════════════════════════════

- Sábio e paciente, como um mentor experiente
- Usa metáforas de "plantar sementes" e "colher frutos"
- Respostas diretas, práticas e acionáveis
- Fala em português brasileiro, se usar termos tecnicos, explica.
- Quando apropriado, cita princípios do livro

═══════════════════════════════════════════════════════════════
                    CONTEXTO DO USUÁRIO
═══════════════════════════════════════════════════════════════

`;

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(req: Request) {
  // 1. Parse and Validate Input
  let parsedBody;
  try {
    const body = await req.json();
    parsedBody = ChatRequestSchema.parse(body);
  } catch (error) {
    console.error("[Arkad] Invalid request body:", error);
    return new Response("Invalid request format", { status: 400 });
  }

  const { messages, conversationId, threadTitle } = parsedBody;

  // 2. Auth Check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 3. Fetch Tenant ID
  const { data: dbUser } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!dbUser?.tenant_id) {
    console.error("[Arkad] Tenant ID not found for user:", user.id);
    return new Response("Tenant configuration missing", { status: 400 });
  }

  const tenantId = Number(dbUser.tenant_id);

  // 4. Fetch User Data (RAG Context)
  console.log(`[Arkad] Fetching context for tenant ${tenantId}...`);

  let context: Awaited<ReturnType<typeof getArkadContext>> | undefined;
  let ragText: string;
  try {
    context = await getArkadContext(tenantId);
    ragText = formatArkadContextAsRAG(context);
    console.log(`[Arkad] Context loaded: ${context.assets.length} assets, ${context.transactions.total} transactions`);
  } catch (error) {
    console.error("[Arkad] Failed to fetch context:", error);
    ragText = "⚠️ Erro ao carregar dados do usuário. Informe que houve um problema técnico.";
  }

  // 5. Build System Prompt
  const systemPrompt = ARKAD_SYSTEM_PROMPT + ragText;

  // 6. Call AI Model
  try {
    console.log(`[Arkad] Calling Gemini 2.5 Flash Lite...`);

    const result = streamText({
      model: google('gemini-2.5-flash-lite') as any,
      system: systemPrompt,
      messages: messages,
      // @ts-ignore - safetySettings supported by Google provider
      experimental_providerMetadata: {
        google: {
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        },
      },
      onFinish: async ({ text, usage, finishReason }: any) => {
        console.log(`[Arkad] Finished: ${finishReason}, ${text?.length || 0} chars`);

        // Save to history
        try {
          const lastUserMsg = messages.slice().reverse().find(m => m.role === 'user');
          await supabase.from('ia_history').insert({
            tenant_id: tenantId,
            user_id: user.id,
            question: lastUserMsg?.content || "Questão desconhecida",
            answer: text || "",
            context_json: {
              conversation_id: conversationId,
              thread_title: threadTitle,
              rag_context: ragText,
              assets_count: context?.assets?.length || 0,
              transactions_count: context?.transactions?.total || 0,
            },
            request_type: 'chat_turn',
            useful_response: null,
          });
        } catch (err) {
          console.error("[Arkad] Failed to save history:", err);
        }
      },
    });

    return result.toTextStreamResponse();

  } catch (error: any) {
    console.error("[Arkad] API Error:", error);

    if (error.toString().includes('429') || error?.status === 429) {
      return new Response("Limite de requisições excedido. Tente novamente em alguns minutos.", {
        status: 429,
        statusText: "Too Many Requests"
      });
    }

    return new Response("Erro interno do servidor", { status: 500 });
  }
}
