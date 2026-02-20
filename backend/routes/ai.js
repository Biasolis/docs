// /backend/routes/ai.js (COMPLETO, CORRIGIDO E COM SUPORTE A HTML)
const express = require('express');
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { parseMarkdown } = require('../markdown-parser'); // <-- IMPORTAÇÃO DO PARSER AQUI

const router = express.Router();

// ------------------------------------------------------------------
// 1. ROTAS DE ADMINISTRAÇÃO (Configurar IA do Setor)
// ------------------------------------------------------------------

router.get('/settings', verifyToken, isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT ai_active, gemini_api_key, ai_last_sync FROM sectors WHERE id = $1',
            [req.user.sector_id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Setor não encontrado.' });
        
        const data = result.rows[0];
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

router.post('/settings', verifyToken, isAdmin, async (req, res) => {
    const { ai_active, gemini_api_key } = req.body;
    try {
        let query, params;
        
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

router.post('/train', verifyToken, isAdmin, async (req, res) => {
    try {
        const sectorRes = await db.query('SELECT ai_last_sync, gemini_api_key FROM sectors WHERE id = $1', [req.user.sector_id]);
        const sector = sectorRes.rows[0];

        if (!sector.gemini_api_key) {
            return res.status(400).json({ message: 'É necessário configurar uma Gemini API Key antes de treinar a IA.' });
        }

        const lastSync = sector.ai_last_sync || new Date(0);

        const updatedRes = await db.query(`
            SELECT count(*) FROM articles 
            WHERE sector_id = $1 AND status = 'published_public' AND updated_at > $2
        `, [req.user.sector_id, lastSync]);

        const removedRes = await db.query(`
            SELECT count(*) FROM articles 
            WHERE sector_id = $1 AND status != 'published_public' AND updated_at > $2
        `, [req.user.sector_id, lastSync]);

        const totalUpdated = parseInt(updatedRes.rows[0].count);
        const totalRemoved = parseInt(removedRes.rows[0].count);

        // Teste de conexão ajustado para a string oficial do Gemini 2.5 Flash Lite
        const genAI = new GoogleGenerativeAI(sector.gemini_api_key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        await model.generateContent("Ping. Responda apenas OK.");

        await db.query('UPDATE sectors SET ai_last_sync = CURRENT_TIMESTAMP WHERE id = $1', [req.user.sector_id]);

        res.json({ 
            message: 'Treinamento concluído com sucesso!', 
            details: `A IA indexou ${totalUpdated} novos/atualizados e removeu ${totalRemoved} artigos privados/excluídos da sua base.`
        });

    } catch (err) {
        console.error("Erro no Treinamento da IA:", err);
        res.status(500).json({ message: 'Falha ao treinar. Verifique se a sua API Key do Gemini é válida e tem permissão para este modelo.', error: err.message });
    }
});


// ------------------------------------------------------------------
// 2. ROTA PÚBLICA (O Chatbot)
// ------------------------------------------------------------------

router.post('/chat', async (req, res) => {
    const { sectorSlug, message, history = [] } = req.body;

    if (!message || !sectorSlug) return res.status(400).json({ message: 'Mensagem ou Setor inválido.' });

    try {
        const sectorRes = await db.query('SELECT id, name, ai_active, gemini_api_key FROM sectors WHERE slug = $1', [sectorSlug]);
        if (sectorRes.rowCount === 0) return res.status(404).json({ message: 'Setor não encontrado.' });
        
        const sector = sectorRes.rows[0];
        if (!sector.ai_active || !sector.gemini_api_key) {
            return res.status(403).json({ message: 'O assistente de IA não está ativo para este setor.' });
        }

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

        const systemInstruction = `
            Você é um assistente virtual especializado de suporte técnico e documentação do setor de ${sector.name} do Consórcio Magalu.
            A sua missão é responder às dúvidas dos utilizadores baseando-se ESTRITAMENTE no contexto fornecido abaixo.
            Se a resposta não estiver no contexto, diga gentilmente que não possui essa informação na base de dados e recomende a abertura de um chamado.
            Não invente comandos, não crie links falsos e seja claro e direto. Responda em Markdown.
            
            BASE DE CONHECIMENTO DISPONÍVEL AGORA:
            ${contextText}
        `;

        const genAI = new GoogleGenerativeAI(sector.gemini_api_key);
        // Atualizado para a string oficial do Gemini 2.5 Flash Lite
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.5-flash-lite",
            systemInstruction: systemInstruction
        });

        // Lógica de Histórico Blindada (Garante que começa com 'user')
        let validHistory = [];
        let nextExpectedRole = 'user';

        for (const msg of history) {
            const mappedRole = (msg.role === 'ai' || msg.role === 'model') ? 'model' : 'user';
            const text = msg.text ? msg.text.trim() : "";
            
            if (!text) continue;

            if (mappedRole === nextExpectedRole) {
                validHistory.push({ role: mappedRole, parts: [{ text: text }] });
                nextExpectedRole = (nextExpectedRole === 'user') ? 'model' : 'user';
            }
        }

        if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') {
            validHistory.pop();
        }

        const chat = model.startChat({ history: validHistory });
        const aiResponse = await chat.sendMessage(message);
        
        // Pega o texto gerado pela IA
        const rawText = aiResponse.response.text();
        
        // --- A MÁGICA DA ESTILIZAÇÃO ACONTECE AQUI ---
        // Converte o Markdown da IA para HTML limpo
        const htmlText = await parseMarkdown(rawText);

        // Retorna a resposta em dois formatos: "answer" para manter o histórico coeso, e "html" para exibir na tela!
        res.json({ answer: rawText, html: htmlText });

    } catch (err) {
        console.error("Erro no Chat IA:", err);
        res.status(500).json({ message: 'Desculpe, ocorreu um erro ao processar sua dúvida com o Gemini. O modelo pode não estar disponível.' });
    }
});

module.exports = router;