// /backend/routes/articles.js (COMPLETO E FINAL - COM SHARP, ROTAS PÚBLICAS, FTS, 3 STATUS, CATEGORIAS, SNIPPETS)
const express = require('express');
const db = require('../db'); // Certifique-se que db.js exporta { query, pool }
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Módulo File System
const sharp = require('sharp'); // Biblioteca de imagens

const router = express.Router();

// --- Configuração do Multer (USA MEMÓRIA PARA SHARP) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
// --------------------------------------------------

// == ROTAS PÚBLICAS (Visível para TODOS - status 'published_public') ==

// ROTA: GET /api/articles/public (Lista APENAS 'published_public')
router.get('/public', async (req, res) => {
    try {
        const query = `
            SELECT a.id, a.title, a.content_markdown, a.status, a.created_at, u.username AS author_username
            FROM articles a JOIN users u ON a.author_id = u.id
            WHERE a.status = 'published_public'
            ORDER BY a.title;
        `;
        const result = await db.query(query);
        // Adiciona snippet: null para consistência com a busca
        res.json(result.rows.map(row => ({...row, snippet: null })));
    } catch (err) {
        console.error("Erro em GET /api/articles/public:", err);
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// ROTA: GET /api/articles/search?q=termo (Busca APENAS 'published_public' com FTS + Snippets)
router.get('/search', async (req, res) => {
    const searchTerm = req.query.q;
    if (!searchTerm || searchTerm.trim() === '') { // Busca vazia
        try {
            const query = `
                SELECT a.id, a.title, a.content_markdown, a.status, a.created_at, u.username AS author_username
                FROM articles a JOIN users u ON a.author_id = u.id
                WHERE a.status = 'published_public' ORDER BY a.title;
            `;
            const result = await db.query(query);
            return res.json(result.rows.map(row => ({...row, snippet: null })));
        } catch (err) {
             console.error("Erro em GET /api/articles/search (vazio):", err);
             return res.status(500).json({ message: 'Erro no servidor', error: err.message });
        }
    }
    // Busca com termo
    try {
        const query = `
            WITH search_query AS ( SELECT plainto_tsquery('portuguese', $1) AS query )
            SELECT a.id, a.title, a.status, a.created_at, u.username AS author_username,
                   ts_rank_cd(a.search_vector, sq.query) AS rank,
                   ts_headline('portuguese', a.content_markdown, sq.query, 'MaxWords=35, MinWords=15, HighlightAll=TRUE, StartSel=<mark>, StopSel=</mark>') AS snippet
            FROM articles a JOIN users u ON a.author_id = u.id CROSS JOIN search_query sq
            WHERE a.status = 'published_public' AND a.search_vector @@ sq.query
            ORDER BY rank DESC, a.title;
        `;
        const params = [searchTerm];
        const result = await db.query(query, params);
        res.json(result.rows); // Retorna com snippet
    } catch (err) {
        console.error("Erro em GET /api/articles/search (FTS):", err);
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// ROTA: GET /api/articles/category/:categoryId (Lista PÚBLICOS de uma categoria)
router.get('/category/:categoryId', async (req, res) => {
     const { categoryId } = req.params;
    if (!/^\d+$/.test(categoryId)) return res.status(400).json({ message: 'ID categoria inválido.' });
    try {
        const query = `
            SELECT a.id, a.title, a.content_markdown, a.status, a.created_at, u.username AS author_username
            FROM articles a JOIN users u ON a.author_id = u.id JOIN article_categories ac ON a.id = ac.article_id
            WHERE a.status = 'published_public' AND ac.category_id = $1 ORDER BY a.title;
        `;
        const result = await db.query(query, [categoryId]);
        res.json(result.rows.map(row => ({...row, snippet: null }))); // Adiciona snippet null
    } catch (err) {
        console.error(`Erro GET /category/${categoryId}:`, err);
        res.status(500).json({ message: 'Erro buscar por categoria', error: err.message });
    }
});

// ROTA PÚBLICA: GET /api/articles/public/:id (Busca UM artigo PÚBLICO completo)
router.get('/public/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^\d+$/.test(id)) return res.status(400).json({ message: 'ID artigo inválido.' });
        const query = `
            SELECT a.*, u.username AS author_username
            FROM articles a JOIN users u ON a.author_id = u.id
            WHERE a.id = $1 AND a.status = 'published_public'; -- Só retorna se for público
        `;
        const result = await db.query(query, [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Artigo não encontrado ou não é público.' });
        
        const categoriesQuery = `SELECT category_id FROM article_categories WHERE article_id = $1;`;
        const categoriesResult = await db.query(categoriesQuery, [id]);
        const article = result.rows[0];
        article.category_ids = categoriesResult.rows.map(row => row.category_id); 
        
        res.json(article); // Retorna o artigo completo
    } catch (err) { console.error(`Erro GET /public/${req.params.id}:`, err); res.status(500).json({ message: 'Erro servidor', error: err.message }); }
});

// ROTA PÚBLICA: GET /api/articles/public-titles (Lista Títulos e IDs para links internos)
router.get('/public-titles', async (req, res) => {
    try {
        const query = `SELECT id, title FROM articles WHERE status = 'published_public' ORDER BY title;`;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) { console.error("Erro GET /public-titles:", err); res.status(500).json({ message: 'Erro buscar títulos', error: err.message }); }
});


// == ROTAS PROTEGIDAS (Requer Login) ==

// ROTA: GET /api/articles (Listar artigos visíveis para o usuário logado)
router.get('/', verifyToken, async (req, res) => {
    try {
        let query;
        if (req.user.role === 'admin') { // Admin vê TUDO
            query = `
                SELECT a.id, a.title, a.status, a.created_at, a.updated_at, u.username AS author_username
                FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.title;
            `;
        } else { // Usuário comum vê internal e public
            query = `
                SELECT a.id, a.title, a.status, a.created_at, a.updated_at, u.username AS author_username
                FROM articles a JOIN users u ON a.author_id = u.id
                WHERE a.status IN ('published_internal', 'published_public') ORDER BY a.title;
            `;
        }
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Erro em GET /api/articles:", err);
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// ROTA: GET /api/articles/:id (Ver um artigo específico + SUAS CATEGORIAS)
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const articleQuery = `SELECT a.*, u.username AS author_username FROM articles a JOIN users u ON a.author_id = u.id WHERE a.id = $1;`;
        const articleResult = await db.query(articleQuery, [id]);
        if (articleResult.rowCount === 0) return res.status(404).json({ message: 'Artigo não encontrado.' });
        const article = articleResult.rows[0];

        if (article.status === 'draft' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Acesso negado a este rascunho.' });
        }

        const categoriesQuery = `SELECT category_id FROM article_categories WHERE article_id = $1;`;
        const categoriesResult = await db.query(categoriesQuery, [id]);
        article.category_ids = categoriesResult.rows.map(row => row.category_id);

        res.json(article);

    } catch (err) {
        console.error(`Erro em GET /api/articles/${req.params.id} (com categorias):`, err);
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// == ROTAS DE ADMIN ==

// ROTA: POST /api/articles (Criar novo artigo + ASSOCIAÇÕES)
router.post('/', verifyToken, isAdmin, async (req, res) => {
    const { title, content_markdown, status, category_ids = [] } = req.body;
    const author_id = req.user.id;
    const validStatuses = ['draft', 'published_internal', 'published_public'];

    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Status inválido."});
    if (!Array.isArray(category_ids) || !category_ids.every(id => Number.isInteger(id))) return res.status(400).json({ message: "Formato inválido para category_ids." });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const insertArticleQuery = `INSERT INTO articles (title, content_markdown, author_id, status, created_at, updated_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *;`;
        const articleParams = [title, content_markdown, author_id, status];
        const articleResult = await client.query(insertArticleQuery, articleParams);
        const newArticle = articleResult.rows[0];

        if (category_ids.length > 0) {
            const insertCategoriesQuery = `INSERT INTO article_categories (article_id, category_id) VALUES ${ category_ids.map((_, index) => `($1, $${index + 2})`).join(', ') }`;
            const categoryParams = [newArticle.id, ...category_ids];
            await client.query(insertCategoriesQuery, categoryParams);
        }
        await client.query('COMMIT');
        newArticle.category_ids = category_ids;
        res.status(201).json(newArticle);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Erro em POST /api/articles (com categorias):", err);
        res.status(500).json({ message: 'Erro ao criar artigo/categorias', error: err.message });
    } finally {
        client.release();
    }
});

// ROTA: PUT /api/articles/:id (Editar artigo + ASSOCIAÇÕES)
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, content_markdown, status, category_ids = [] } = req.body;
    const validStatuses = ['draft', 'published_internal', 'published_public'];

    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Status inválido."});
    if (!Array.isArray(category_ids) || !category_ids.every(id => Number.isInteger(id))) return res.status(400).json({ message: "Formato inválido para category_ids." });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const updateArticleQuery = `UPDATE articles SET title = $1, content_markdown = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *;`;
        const articleParams = [title, content_markdown, status, id];
        const articleResult = await client.query(updateArticleQuery, articleParams);

        if (articleResult.rowCount === 0) {
             await client.query('ROLLBACK'); client.release();
             return res.status(404).json({ message: 'Artigo não encontrado.' });
        }
        const updatedArticle = articleResult.rows[0];

        await client.query('DELETE FROM article_categories WHERE article_id = $1', [id]);

        if (category_ids.length > 0) {
            const insertCategoriesQuery = `INSERT INTO article_categories (article_id, category_id) VALUES ${ category_ids.map((_, index) => `($1, $${index + 2})`).join(', ') }`;
            const categoryParams = [id, ...category_ids];
            await client.query(insertCategoriesQuery, categoryParams);
        }
        await client.query('COMMIT');
        updatedArticle.category_ids = category_ids;
        res.json(updatedArticle);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Erro em PUT /api/articles/${id} (com categorias):`, err);
        res.status(500).json({ message: 'Erro ao atualizar artigo/categorias', error: err.message });
    } finally {
        client.release();
    }
});

// ROTA: DELETE /api/articles/:id (Apagar artigo - admin)
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        // CORREÇÃO: Estava apagando da tabela 'users' em vez de 'articles'
        const result = await db.query('DELETE FROM articles WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Artigo não encontrado.' });
        res.status(204).send();
    } catch (err) {
        console.error(`Erro em DELETE /api/articles/${id}:`, err);
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// (ROTA MODIFICADA - USA SHARP) POST /api/articles/upload-image
router.post('/upload-image', verifyToken, isAdmin, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo.' });
    try {
        const timestamp = Date.now();
        const outputFilename = `${timestamp}.webp`;
        const outputPath = path.join(__dirname, '..', '..', 'public', 'images', outputFilename);
        await sharp(req.file.buffer)
            .resize({ width: 1200, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(outputPath);
        const imageUrl = `/images/${outputFilename}`;
        res.status(200).json({ url: imageUrl });
    } catch (err) { console.error("Erro Sharp:", err); res.status(500).json({ message: 'Erro processar imagem', error: err.message }); }
});

module.exports = router;