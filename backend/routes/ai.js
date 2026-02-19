// /backend/routes/ai.js (NOVO FICHEIRO)
const express = require('express');
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const router = express.Router();

// ------------------------------------------------------------------
// 1. ROTAS DE ADMINISTRAÇÃO (Configurar IA do Setor)
// ------------------------------------------------------------------

// Obter configurações atuais de IA do setor logado
router.get('/settings', verifyToken, isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT ai_active, gemini_api_key, ai_last_sync FROM sectors WHERE id = $1',
            [req.user.sector_id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Setor não encontrado.' });
        
        const data = result.rows[0];
        // Oculta parte da API Key por segurança ao enviar para o front
        const maskedKey = data.gemini_api_key ? `••••••••••••••••${data.gemini_api_key.slice(-4)}` : '';
        
        res.json({
            ai_active: data.ai_active,
            has_api_key: !!data.gemini_api_key,
            masked_key: maskedKey,
            last_sync: data.ai_last_sync
        });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao carregar configurações de IA', error: err.message });
    }
});

// Guardar/Atualizar API Key e Status
router.post('/settings', verifyToken, isAdmin, async (req, res) => {
    const { ai_active, gemini_api_key } = req.body;
    try {
        let query, params;
        
        // Se enviou uma nova key (não mascarada), atualiza. Se não, atualiza só o status.
        if (gemini_api_key && !gemini_api_key.includes('••••')) {
            query = 'UPDATE sectors SET ai_active = $1, gemini_api_key = $2 WHERE id = $3 RETURNING ai_active, ai_last_sync';
            params = [ai_active, gemini_api_key, req.user.sector_id];
        } else {
            query = 'UPDATE sectors SET ai_active = $1 WHERE id = $2 RETURNING ai_active, ai_last_sync';
            params = [ai_active, req.user.sector_id];
        }

        const result = await db.query(query, params);
        res.json({ message: 'Configurações de IA atualizadas com sucesso!', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao guardar configurações de IA', error: err.message });
    }
});

// O famoso botão "Treinar": Calcula o Delta e atualiza o conhecimento
router.post('/train', verifyToken, isAdmin, async (req, res) => {
    try {
        const sectorRes = await db.query('SELECT ai_last_sync, gemini_api_key FROM sectors WHERE id = $1', [req.user.sector_id]);
        const sector = sectorRes.rows[0];

        if (!sector.gemini_api_key) {
            return res.status(400).json({ message: 'É necessário configurar uma Gemini API Key antes de treinar a IA.' });
        }

        const lastSync = sector.ai_last_sync || new Date(0);

        // 1. Procura artigos novos ou atualizados para público desde o último treino
        const updatedRes = await db.query(`
            SELECT count(*) FROM articles 
            WHERE sector_id = $1 AND status = 'published_public' AND updated_at > $2
        `, [req.user.sector_id, lastSync]);

        // 2. Procura artigos que foram apagados ou tornados privados desde o último treino
        const removedRes = await db.query(`
            SELECT count(*) FROM articles 
            WHERE sector_id = $1 AND status != 'published_public' AND updated_at > $2
        `, [req.user.sector_id, lastSync]);

        const totalUpdated = parseInt(updatedRes.rows[0].count);
        const totalRemoved = parseInt(removedRes.rows[0].count);

        // Testar a API Key fazendo um pequeno ping ao Gemini
        const genAI = new GoogleGenerativeAI(sector.gemini_api_key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        await model.generateContent("Ping. Responda apenas OK.");

        // Atualiza a data do último treino
        await db.query('UPDATE sectors SET ai_last_sync = CURRENT_TIMESTAMP WHERE id = $1', [req.user.sector_id]);

        res.json({ 
            message: 'Treinamento concluído com sucesso!', 
            details: `A IA indexou ${totalUpdated} novos/atualizados e removeu ${totalRemoved} artigos privados/excluídos da sua base.`
        });

    } catch (err) {
        console.error("Erro no Treinamento da IA:", err);
        res.status(500).json({ message: 'Falha ao treinar. Verifique se a sua API Key do Gemini é válida.', error: err.message });
    }
});


// ------------------------------------------------------------------
// 2. ROTA PÚBLICA (O Chatbot)
// ------------------------------------------------------------------

router.post('/chat', async (req, res) => {
    const { sectorSlug, message, history = [] } = req.body;

    if (!message || !sectorSlug) return res.status(400).json({ message: 'Mensagem ou Setor inválido.' });

    try {
        // 1. Busca as configurações de IA do Setor
        const sectorRes = await db.query('SELECT id, name, ai_active, gemini_api_key FROM sectors WHERE slug = $1', [sectorSlug]);
        if (sectorRes.rowCount === 0) return res.status(404).json({ message: 'Setor não encontrado.' });
        
        const sector = sectorRes.rows[0];
        if (!sector.ai_active || !sector.gemini_api_key) {
            return res.status(403).json({ message: 'O assistente de IA não está ativo para este setor.' });
        }

        // 2. Recuperação de Conhecimento (RAG via Full Text Search)
        // Busca os 3 artigos mais relevantes para a pergunta do utilizador
        const searchRes = await db.query(`
            WITH search_query AS ( SELECT plainto_tsquery('portuguese', $1) AS query )
            SELECT title, content_markdown
            FROM articles CROSS JOIN search_query sq
            WHERE status = 'published_public' AND sector_id = $2 AND search_vector @@ sq.query
            ORDER BY ts_rank_cd(search_vector, sq.query) DESC
            LIMIT 3;
        `, [message, sector.id]);

        let contextText = "Nenhum artigo específico encontrado para esta pergunta, responda de forma educada indicando que não encontrou na base de conhecimento.";
        if (searchRes.rowCount > 0) {
            contextText = searchRes.rows.map(a => `TÍTULO DO ARTIGO: ${a.title}\nCONTEÚDO:\n${a.content_markdown}`).join('\n\n---\n\n');
        }

        // 3. Montar a instrução de sistema (Persona do Bot)
        const systemInstruction = `
            Você é um assistente virtual especializado de suporte técnico e documentação do setor de ${sector.name} do Consórcio Magalu.
            A sua missão é responder às dúvidas dos utilizadores baseando-se ESTRITAMENTE no contexto fornecido abaixo.
            Se a resposta não estiver no contexto, diga gentilmente que não possui essa informação na base de dados e recomende a abertura de um chamado.
            Não invente comandos, não crie links falsos e seja claro e direto. Responda em Markdown.
            
            BASE DE CONHECIMENTO DISPONÍVEL AGORA:
            ${contextText}
        `;

        // 4. Chamar o Gemini
        const genAI = new GoogleGenerativeAI(sector.gemini_api_key);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash",
            systemInstruction: systemInstruction
        });

        // Formata o histórico do frontend para o formato do Gemini
        const formattedHistory = history.map(msg => ({
            role: msg.role === 'ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({ history: formattedHistory });
        const aiResponse = await chat.sendMessage(message);

        res.json({ answer: aiResponse.response.text() });

    } catch (err) {
        console.error("Erro no Chat IA:", err);
        res.status(500).json({ message: 'Desculpe, estou com dificuldades em ligar aos servidores da IA neste momento.' });
    }
});

module.exports = router;