// /backend/routes/articles.js (COMPLETO E CORRIGIDO)
const express = require('express');
const db = require('../db');
const { verifyToken, isEditor, isSuperAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const { parseMarkdown } = require('../markdown-parser');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

async function convertArticlesToHtml(articles) {
    for (const article of articles) {
        article.content_html = await parseMarkdown(article.content_markdown);
        delete article.content_markdown;
    }
    return articles;
}

// --- Função Auxiliar ---
async function getSectorId(slug) {
    if (!slug) return null;
    const res = await db.query('SELECT id FROM sectors WHERE slug = $1', [slug]);
    return res.rowCount > 0 ? res.rows[0].id : null;
}

// == ROTAS PÚBLICAS ==

router.get('/public', async (req, res) => {
    try {
        const sectorId = await getSectorId(req.query.sector);
        if (!sectorId) return res.json([]);

        const query = `
            SELECT a.id, a.title, a.content_markdown, a.status, a.created_at, u.username AS author_username
            FROM articles a JOIN users u ON a.author_id = u.id
            WHERE a.status = 'published_public' AND a.sector_id = $1
            ORDER BY a.title;
        `;
        const result = await db.query(query, [sectorId]);
        const articlesWithHtml = await convertArticlesToHtml(result.rows);
        res.json(articlesWithHtml.map(row => ({...row, snippet: null })));
    } catch (err) { res.status(500).json({ message: 'Erro no servidor', error: err.message }); }
});

router.get('/search', async (req, res) => {
    const searchTerm = req.query.q;
    const sectorSlug = req.query.sector;
    try {
        const sectorId = await getSectorId(sectorSlug);
        if (!sectorId) return res.json([]);

        if (!searchTerm || searchTerm.trim() === '') {
            const query = `SELECT a.id, a.title, a.content_markdown, a.status, a.created_at, u.username AS author_username FROM articles a JOIN users u ON a.author_id = u.id WHERE a.status = 'published_public' AND a.sector_id = $1 ORDER BY a.title;`;
            const result = await db.query(query, [sectorId]);
            const articlesWithHtml = await convertArticlesToHtml(result.rows);
            return res.json(articlesWithHtml.map(row => ({...row, snippet: null })));
        }

        const query = `
            WITH search_query AS ( SELECT plainto_tsquery('portuguese', $1) AS query )
            SELECT a.id, a.title, a.status, a.created_at, u.username AS author_username,
                   ts_rank_cd(a.search_vector, sq.query) AS rank,
                   ts_headline('portuguese', a.content_markdown, sq.query, 'MaxWords=35, MinWords=15, HighlightAll=TRUE, StartSel=<mark>, StopSel=</mark>') AS snippet
            FROM articles a JOIN users u ON a.author_id = u.id CROSS JOIN search_query sq
            WHERE a.status = 'published_public' AND a.sector_id = $2 AND a.search_vector @@ sq.query
            ORDER BY rank DESC, a.title;
        `;
        const result = await db.query(query, [searchTerm, sectorId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Erro no servidor', error: err.message }); }
});

router.get('/category/:categoryId', async (req, res) => {
    const { categoryId } = req.params;
    try {
        const sectorId = await getSectorId(req.query.sector);
        if (!sectorId) return res.json([]);
        
        const query = `
            SELECT a.id, a.title, a.content_markdown, a.status, a.created_at, u.username AS author_username
            FROM articles a JOIN users u ON a.author_id = u.id JOIN article_categories ac ON a.id = ac.article_id
            WHERE a.status = 'published_public' AND ac.category_id = $1 AND a.sector_id = $2 ORDER BY a.title;
        `;
        const result = await db.query(query, [categoryId, sectorId]);
        const articlesWithHtml = await convertArticlesToHtml(result.rows);
        res.json(articlesWithHtml.map(row => ({...row, snippet: null })));
    } catch (err) { res.status(500).json({ message: 'Erro buscar por categoria', error: err.message }); }
});

router.get('/public/:id', async (req, res) => {
    const { id } = req.params; 
    try {
        if (!/^\d+$/.test(id)) return res.status(400).json({ message: 'ID artigo inválido.' });
        const sectorId = await getSectorId(req.query.sector);
        if (!sectorId) return res.status(404).json({ message: 'Setor não encontrado.' });

        const query = `
            SELECT a.*, u.username AS author_username
            FROM articles a JOIN users u ON a.author_id = u.id
            WHERE a.id = $1 AND a.status = 'published_public' AND a.sector_id = $2;
        `;
        const result = await db.query(query, [id, sectorId]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Artigo não encontrado ou não é público.' });
        
        const article = result.rows[0];
        article.content_html = await parseMarkdown(article.content_markdown);
        delete article.content_markdown;

        const categoriesResult = await db.query(`SELECT category_id FROM article_categories WHERE article_id = $1;`, [id]);
        article.category_ids = categoriesResult.rows.map(row => row.category_id); 
        res.json(article);
    } catch (err) { res.status(500).json({ message: 'Erro servidor', error: err.message }); }
});

router.get('/public-titles', async (req, res) => {
    try {
        const sectorId = await getSectorId(req.query.sector);
        if (!sectorId) return res.json([]);
        const result = await db.query(`SELECT id, title FROM articles WHERE status = 'published_public' AND sector_id = $1 ORDER BY title;`, [sectorId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Erro buscar títulos', error: err.message }); }
});

// == ROTAS PROTEGIDAS (Requer Login) ==

router.get('/global', verifyToken, isSuperAdmin, async (req, res) => {
    try {
        const query = `
            SELECT a.id, a.title, a.status, a.created_at, u.username AS author_username, s.name AS sector_name, s.slug AS sector_slug
            FROM articles a 
            JOIN users u ON a.author_id = u.id
            JOIN sectors s ON a.sector_id = s.id
            ORDER BY s.name ASC, a.title ASC;
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

router.get('/', verifyToken, async (req, res) => {
    try {
        let query;
        if (req.user.role === 'user') { 
            query = `
                SELECT a.id, a.title, a.status, a.created_at, a.updated_at, u.username AS author_username
                FROM articles a JOIN users u ON a.author_id = u.id
                WHERE a.status IN ('published_internal', 'published_public') AND a.sector_id = $1 ORDER BY a.title;
            `;
        } else { 
            query = `
                SELECT a.id, a.title, a.status, a.created_at, a.updated_at, u.username AS author_username
                FROM articles a JOIN users u ON a.author_id = u.id
                WHERE a.sector_id = $1 ORDER BY a.title;
            `;
        }
        const result = await db.query(query, [req.user.sector_id]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ message: 'Erro no servidor', error: err.message }); }
});

router.get('/:id', verifyToken, async (req, res) => {
    const { id } = req.params; 
    try {
        let articleQuery, articleParams;

        if (req.user.role === 'super_admin') {
            articleQuery = `SELECT a.*, u.username AS author_username FROM articles a JOIN users u ON a.author_id = u.id WHERE a.id = $1;`;
            articleParams = [id];
        } else {
            articleQuery = `SELECT a.*, u.username AS author_username FROM articles a JOIN users u ON a.author_id = u.id WHERE a.id = $1 AND a.sector_id = $2;`;
            articleParams = [id, req.user.sector_id];
        }

        const articleResult = await db.query(articleQuery, articleParams);
        if (articleResult.rowCount === 0) return res.status(404).json({ message: 'Artigo não encontrado.' });
        
        const article = articleResult.rows[0];

        if ((article.status === 'draft' || article.status === 'published_internal_private') && req.user.role === 'user') {
            return res.status(403).json({ message: 'Acesso negado a este conteúdo restrito.' });
        }

        article.content_html = await parseMarkdown(article.content_markdown);
        const categoriesResult = await db.query(`SELECT category_id FROM article_categories WHERE article_id = $1;`, [id]);
        article.category_ids = categoriesResult.rows.map(row => row.category_id);

        res.json(article);
    } catch (err) { res.status(500).json({ message: 'Erro no servidor', error: err.message }); }
});

// == ROTAS DE ESCRITA (Requer Editor ou superior) ==
router.use(verifyToken, isEditor);

router.post('/', async (req, res) => {
    const { title, content_markdown, status, category_ids = [] } = req.body;
    const author_id = req.user.id;
    const sector_id = req.user.sector_id; 
    const validStatuses = ['draft', 'published_internal_private', 'published_internal', 'published_public'];

    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Status inválido."});

    try {
        const insertArticleQuery = `INSERT INTO articles (title, content_markdown, author_id, status, sector_id, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *;`;
        const articleParams = [title, content_markdown, author_id, status, sector_id];
        const articleResult = await db.query(insertArticleQuery, articleParams);
        const newArticle = articleResult.rows[0];

        if (category_ids && category_ids.length > 0) {
            const insertCategoriesQuery = `INSERT INTO article_categories (article_id, category_id) VALUES ${ category_ids.map((_, index) => `($1, $${index + 2})`).join(', ') }`;
            await db.query(insertCategoriesQuery, [newArticle.id, ...category_ids]);
        }
        newArticle.category_ids = category_ids;
        res.status(201).json(newArticle);
    } catch (err) {
        console.error("Erro ao CRIAR artigo:", err);
        res.status(500).json({ message: 'Erro interno ao criar artigo', error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { title, content_markdown, status, category_ids = [] } = req.body;
    const validStatuses = ['draft', 'published_internal_private', 'published_internal', 'published_public'];

    if (!validStatuses.includes(status)) return res.status(400).json({ message: "Status inválido."});

    try {
        let updateArticleQuery, queryParams;
        if (req.user.role === 'super_admin') {
            updateArticleQuery = `UPDATE articles SET title = $1, content_markdown = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *;`;
            queryParams = [title, content_markdown, status, id];
        } else {
            updateArticleQuery = `UPDATE articles SET title = $1, content_markdown = $2, status = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND sector_id = $5 RETURNING *;`;
            queryParams = [title, content_markdown, status, id, req.user.sector_id];
        }

        const articleResult = await db.query(updateArticleQuery, queryParams);

        if (articleResult.rowCount === 0) {
             return res.status(404).json({ message: 'Artigo não encontrado no seu setor.' });
        }

        await db.query('DELETE FROM article_categories WHERE article_id = $1', [id]);
        if (category_ids && category_ids.length > 0) {
            const insertCategoriesQuery = `INSERT INTO article_categories (article_id, category_id) VALUES ${ category_ids.map((_, index) => `($1, $${index + 2})`).join(', ') }`;
            await db.query(insertCategoriesQuery, [id, ...category_ids]);
        }
        res.json(articleResult.rows[0]);
    } catch (err) {
        console.error("Erro ao ATUALIZAR artigo:", err);
        res.status(500).json({ message: 'Erro interno ao atualizar artigo', error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        let deleteQuery, deleteParams;
        if (req.user.role === 'super_admin') {
            deleteQuery = 'DELETE FROM articles WHERE id = $1';
            deleteParams = [id];
        } else {
            deleteQuery = 'DELETE FROM articles WHERE id = $1 AND sector_id = $2';
            deleteParams = [id, req.user.sector_id];
        }

        const result = await db.query(deleteQuery, deleteParams);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Artigo não encontrado.' });
        res.status(204).send();
    } catch (err) { res.status(500).json({ message: 'Erro no servidor', error: err.message }); }
});

router.post('/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo.' });
    try {
        const timestamp = Date.now();
        const outputFilename = `${timestamp}.webp`;
        const outputPath = path.join(__dirname, '..', '..', 'public', 'images', outputFilename);
        await sharp(req.file.buffer).resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toFile(outputPath);
        res.status(200).json({ url: `/images/${outputFilename}` });
    } catch (err) { res.status(500).json({ message: 'Erro processar imagem', error: err.message }); }
});

module.exports = router;