// /backend/routes/categories.js (COMPLETO E CORRIGIDO)
const express = require('express');
const db = require('../db');
const { verifyToken, isEditor } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

const router = express.Router();

// --- Função Auxiliar: Obter ID do Setor pelo Slug ---
async function getSectorId(slug) {
    if (!slug) return null;
    const res = await db.query('SELECT id FROM sectors WHERE slug = $1', [slug]);
    return res.rowCount > 0 ? res.rows[0].id : null;
}

// --- Rotas Públicas ---

// Rota para árvore de categorias (usada na sidebar pública)
router.get('/tree', async (req, res) => {
    try {
        const sectorId = await getSectorId(req.query.sector);
        if (!sectorId) return res.json([]);

        const result = await db.query(
            'SELECT id, name, parent_id FROM categories WHERE sector_id = $1 ORDER BY name', 
            [sectorId]
        );
        
        const buildTree = (categories, parentId = null) => {
            const nodes = [];
            for (const category of categories) {
                if (category.parent_id === parentId) {
                    const children = buildTree(categories, category.id);
                    const node = { ...category };
                    if (children.length > 0) node.children = children;
                    nodes.push(node);
                }
            }
            return nodes;
        };
        res.json(buildTree(result.rows));
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar árvore de categorias', error: err.message });
    }
});

// Rota para listagem simples (ajustada para priorizar o filtro por slug)
router.get('/', async (req, res) => {
    try {
        const { sector } = req.query; // Pega o slug da query string (?sector=slug)
        let sectorId = null;

        if (sector) {
            // Se houver um setor na URL, buscamos o ID dele estritamente (independente de quem está logado)
            const resSector = await db.query('SELECT id FROM sectors WHERE slug = $1', [sector]);
            if (resSector.rowCount > 0) {
                sectorId = resSector.rows[0].id;
            } else {
                // Se o slug foi passado mas não existe no banco, retorna vazio para evitar lixo visual
                return res.json([]);
            }
        } else if (req.headers['authorization']) {
            // Se NÃO houver setor na URL, mas houver token (uso interno/admin), usa o setor do usuário
            const token = req.headers['authorization'].split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'c8bd8cb5cb70b4cb9fac5b3faf51d896b21a10586882104aa4290e2bdbbaa04c');
                // Buscamos o setor atual do DB para garantir que o token não contenha info obsoleta
                const userRes = await db.query('SELECT sector_id FROM users WHERE id = $1', [decoded.id]);
                if (userRes.rowCount > 0) sectorId = userRes.rows[0].sector_id;
            } catch (e) { /* Segue sem sectorId caso o token falhe */ }
        }

        // Se não identificou nenhum setor (nem via URL, nem via Login), retorna vazio
        if (!sectorId) return res.json([]);

        // Filtro OBRIGATÓRIO por sector_id para isolação total
        const result = await db.query(
            'SELECT id, name, parent_id FROM categories WHERE sector_id = $1 ORDER BY name', 
            [sectorId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao listar categorias', error: err.message });
    }
});


// --- Rotas de Administração (Requer Editor, Admin ou Super Admin) ---
router.use(verifyToken, isEditor);

router.post('/', async (req, res) => {
    const { name, parent_id } = req.body; 
    if (!name || name.trim() === '') return res.status(400).json({ message: 'Nome da categoria é obrigatório.' });

    try {
        const result = await db.query(
            'INSERT INTO categories (name, parent_id, sector_id) VALUES ($1, $2, $3) RETURNING *',
            [name.trim(), parent_id || null, req.user.sector_id] 
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar categoria', error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, parent_id } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ message: 'Nome é obrigatório.' });
    if (id == parent_id) return res.status(400).json({ message: 'Categoria não pode ser pai dela mesma.' });

    try {
        // Garante que o usuário só edite categorias do SEU próprio setor
        const result = await db.query(
            'UPDATE categories SET name = $1, parent_id = $2 WHERE id = $3 AND sector_id = $4 RETURNING *',
            [name.trim(), parent_id || null, id, req.user.sector_id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Categoria não encontrada ou não pertence ao seu setor.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erro ao atualizar categoria', error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Garante que o usuário só apague categorias do SEU próprio setor
        const result = await db.query('DELETE FROM categories WHERE id = $1 AND sector_id = $2', [id, req.user.sector_id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Categoria não encontrada.' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Erro ao deletar categoria', error: err.message });
    }
});

module.exports = router;