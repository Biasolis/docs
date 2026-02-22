// /backend/routes/ai.js
const express = require('express');
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { parseMarkdown } = require('../markdown-parser'); 

const router = express.Router();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://172.16.13.43:11434'; 
const OLLAMA_MODEL = 'gemma3:4b';

// ------------------------------------------------------------------
// 1. ROTAS DE ADMINISTRAÇÃO 
// ------------------------------------------------------------------

router.get('/settings', verifyToken, isAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT ai_active, gemini_api_key, ai_last_sync, ai_provider, ai_status FROM sectors WHERE id = $1',
            [req.user.sector_id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Setor não encontrado.' });
        
        const data = result.rows[0];
        const maskedKey = data.gemini_api_key ? `••••••••••••••••${data.gemini_api_key.slice(-4)}` : '';
        
        res.json({
            ai_active: data.ai_active,
            ai_provider: data.ai_provider || 'gemini',
            has_api_key: !!data.gemini_api_key,
            masked_key: maskedKey,
            last_sync: data.ai_last_sync,
            ai_status: data.ai_status || 'ready'
        });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao carregar configurações de IA', error: err.message });
    }
});

router.post('/settings', verifyToken, isAdmin, async (req, res) => {
    const { ai_active, gemini_api_key, ai_provider } = req.body;
    try {
        let query, params;
        if (gemini_api_key && !gemini_api_key.includes('••••')) {
            query = 'UPDATE sectors SET ai_active = $1, gemini_api_key = $2, ai_provider = $3 WHERE id = $4 RETURNING *';
            params = [ai_active, gemini_api_key, ai_provider, req.user.sector_id];
        } else {
            query = 'UPDATE sectors SET ai_active = $1, ai_provider = $2 WHERE id = $3 RETURNING *';
            params = [ai_active, ai_provider, req.user.sector_id];
        }
        await db.query(query, params);
        res.json({ message: 'Configurações atualizadas com sucesso!' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao guardar configurações', error: err.message });
    }
});

router.post('/train', verifyToken, isAdmin, async (req, res) => {
    try {
        await db.query("UPDATE sectors SET ai_status = 'training' WHERE id = $1", [req.user.sector_id]);

        const sectorRes = await db.query('SELECT slug, ai_provider, gemini_api_key FROM sectors WHERE id = $1', [req.user.sector_id]);
        const provider = sectorRes.rows[0].ai_provider || 'gemini';

        if (provider === 'gemini' && !sectorRes.rows[0].gemini_api_key) {
            await db.query("UPDATE sectors SET ai_status = 'ready' WHERE id = $1", [req.user.sector_id]);
            return res.status(400).json({ message: 'É necessário configurar uma Gemini API Key.' });
        }

        const articlesRes = await db.query(`SELECT title, content_markdown FROM articles WHERE sector_id = $1 AND status = 'published_public'`, [req.user.sector_id]);
        
        let compiledKnowledge = "Base de Conhecimento Vazia.";
        if (articlesRes.rowCount > 0) {
            // Removida a inserção de links do contexto treinado. Apenas o título e o conteúdo são injetados.
            compiledKnowledge = articlesRes.rows.map(a => `[ARTIGO: ${a.title}]\n${a.content_markdown}`).join('\n\n======================\n\n').substring(0, 30000);
        }

        if (provider === 'gemini') {
            const genAI = new GoogleGenerativeAI(sectorRes.rows[0].gemini_api_key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
            await model.generateContent("Ping.");
        } else if (provider === 'ollama') {
            const ollamaCheck = await fetch(`${OLLAMA_URL}/api/tags`);
            if (!ollamaCheck.ok) throw new Error('Servidor Ollama local indisponível.');
            
             await fetch(`${OLLAMA_URL}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: OLLAMA_MODEL, prompt: "Ping.", stream: false, keep_alive: "1h" })
            });
        }

        await db.query(
            "UPDATE sectors SET knowledge_context = $1, ai_last_sync = CURRENT_TIMESTAMP, ai_status = 'ready' WHERE id = $2", 
            [compiledKnowledge, req.user.sector_id]
        );

        res.json({ message: 'Treinamento concluído!', details: `A IA processou ${articlesRes.rowCount} artigos da sua base.` });

    } catch (err) {
        await db.query("UPDATE sectors SET ai_status = 'ready' WHERE id = $1", [req.user.sector_id]);
        console.error("Erro no Treino:", err);
        res.status(500).json({ message: 'Falha ao treinar. Verifique a conexão com a IA escolhida.', error: err.message });
    }
});


// ------------------------------------------------------------------
// 2. ROTA PÚBLICA (O Chatbot Híbrido)
// ------------------------------------------------------------------

router.post('/chat', async (req, res) => {
    const { sectorSlug, message, history = [] } = req.body;

    if (!message || !sectorSlug) return res.status(400).json({ message: 'Mensagem ou Setor inválido.' });

    try {
        const sectorRes = await db.query('SELECT id, name, ai_active, gemini_api_key, ai_provider, ai_status, knowledge_context FROM sectors WHERE slug = $1', [sectorSlug]);
        if (sectorRes.rowCount === 0) return res.status(404).json({ message: 'Setor não encontrado.' });
        
        const sector = sectorRes.rows[0];
        const provider = sector.ai_provider || 'gemini';

        if (sector.ai_status === 'training') {
            return res.status(423).json({ message: 'Em treinamento, aguarde para fazer sua pergunta.', isTraining: true });
        }

        if (!sector.ai_active || (provider === 'gemini' && !sector.gemini_api_key)) {
            return res.status(403).json({ message: 'O assistente de IA não está ativo ou configurado corretamente.' });
        }

        let rawText = '';

        if (provider === 'gemini') {
            const words = message
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
                .replace(/[^\w\s]/gi, ' ') 
                .trim()
                .split(/\s+/)
                .filter(w => w.length > 3 && !['como', 'onde', 'qual', 'quem', 'para', 'pode', 'dica', 'ajuda'].includes(w.toLowerCase()));

            let searchRes = { rowCount: 0, rows: [] };
            
            if (words.length > 0) {
                 const searchWords = words.slice(0, 5);
                 let likeString = "%";
                 searchWords.forEach(w => { likeString += w + "%" });

                 const querySql = `
                     SELECT title, content_markdown 
                     FROM articles 
                     WHERE status = 'published_public' AND sector_id = $1 
                     AND (title ILIKE $2 OR content_markdown ILIKE $2)
                     LIMIT 3;
                 `;
                 searchRes = await db.query(querySql, [sector.id, likeString]);
                 
                 if (searchRes.rowCount === 0 && searchWords.length > 1) {
                     const fallbackSql = `
                         SELECT title, content_markdown 
                         FROM articles 
                         WHERE status = 'published_public' AND sector_id = $1 
                         AND (title ILIKE $2 OR content_markdown ILIKE $2)
                         LIMIT 3;
                     `;
                     searchRes = await db.query(fallbackSql, [sector.id, `%${searchWords[0]}%`]);
                 }
            }

            let contextText = "INFORMAÇÃO NÃO ENCONTRADA NA BASE DE DADOS.";
            if (searchRes.rowCount > 0) {
                contextText = searchRes.rows.map(a => {
                    const truncatedContent = a.content_markdown.substring(0, 1500); 
                    return `[ARTIGO: ${a.title}]\n${truncatedContent}...`;
                }).join('\n\n---\n\n');
            }

            // GEMINI PROMPT (Sem links)
            const systemInstruction = `Você é um assistente virtual de suporte do setor de ${sector.name}.
CONTEXTO OBRIGATÓRIO:
${contextText}

INSTRUÇÕES:
- Se encontrar a resposta no contexto: Faça um resumo explicativo e finalize com "Fonte: [NOME DO ARTIGO]". NUNCA adicione links.
- Se a resposta NÃO estiver no contexto: Escreva APENAS "Desculpe, não encontrei essa informação na nossa base. Por favor, abra um chamado de suporte."`;

            const genAI = new GoogleGenerativeAI(sector.gemini_api_key);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite", systemInstruction });

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
            if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === 'user') validHistory.pop();

            const chat = model.startChat({ history: validHistory });
            const aiResponse = await chat.sendMessage(message);
            rawText = aiResponse.response.text();

        // ==========================================
        // FLUXO 2: OLLAMA (SIMPLIFICADO E SEM LINKS)
        // ==========================================
        } else if (provider === 'ollama') {
            
            const contextText = sector.knowledge_context || "Vazio.";

            // OLLAMA PROMPT ATUALIZADO: Foco apenas em fornecer conteúdo com citações, ignorando a criação de links ou formatações complexas que o confundem.
            const promptFinal = `Você é o assistente virtual do Consórcio Magalu. Leia a Base de Conhecimento abaixo para responder à pergunta do usuário.

=== BASE DE CONHECIMENTO ===
${contextText}
============================

INSTRUÇÕES OBRIGATÓRIAS:
1. Responda à pergunta do usuário utilizando APENAS as informações da Base de Conhecimento acima.
2. Formate sua resposta de forma clara, utilizando tópicos se necessário.
3. No final da sua resposta, cite o nome do artigo utilizado no formato: "Fonte: [Nome do Artigo]".
4. NUNCA gere links. NUNCA invente informações externas.
5. Se a resposta para a pergunta NÃO estiver na Base de Conhecimento, você DEVE ignorar todas as regras anteriores e responder APENAS E EXATAMENTE: "Desculpe, não encontrei essa informação na nossa base. Por favor, abra um chamado de suporte."

Pergunta do usuário: "${message}"`;

            let ollamaMessages = [];

            // A história é enviada apenas para contexto. As regras foram movidas para a última mensagem para garantir que o modelo não as perca.
            let validHistory = history.filter(msg => msg.text && msg.text.trim() !== '');
            
            if (validHistory.length > 0 && validHistory[0].role === 'ai' && validHistory[0].text.includes('Olá! 👋')) {
                validHistory.shift();
            }

            for (const msg of validHistory) {
                const role = (msg.role === 'ai' || msg.role === 'model') ? 'assistant' : 'user';
                ollamaMessages.push({ role: role, content: msg.text });
            }

            // Injeta a instrução final com a pergunta.
            ollamaMessages.push({ role: 'user', content: promptFinal });

            const ollamaResponse = await fetch(`${OLLAMA_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    messages: ollamaMessages,
                    stream: false,
                    keep_alive: "1h", 
                    options: { 
                        temperature: 0.1,     
                        repeat_penalty: 1.15, 
                        num_ctx: 8192,  
                        top_k: 40,
                        top_p: 0.9
                    } 
                })
            });

            if (!ollamaResponse.ok) throw new Error('Falha ao comunicar com o servidor Ollama.');
            
            const data = await ollamaResponse.json();
            rawText = data.message.content; 
        }

        const htmlText = await parseMarkdown(rawText);
        res.json({ answer: rawText, html: htmlText });

    } catch (err) {
        console.error("Erro no Chat IA:", err);
        res.status(500).json({ message: 'Desculpe, o servidor de Inteligência Artificial não pôde processar a requisição no momento.' });
    }
});

module.exports = router;