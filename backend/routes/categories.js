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

router.get('/', async (req, res) => {
    try {
        const { sector } = req.query; 
        let sectorId = null;

        // PRIORIDADE 1: Se houver setor na URL, busca estritamente as categorias dele
        if (sector) {
            const sectorRes = await db.query('SELECT id FROM sectors WHERE slug = $1', [sector]);
            if (sectorRes.rowCount > 0) {
                sectorId = sectorRes.rows[0].id;
            }
        } 
        // PRIORIDADE 2: Se não houver setor na URL mas houver login (Painel Admin)
        else if (req.headers['authorization']) {
            const token = req.headers['authorization'].split(' ')[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'c8bd8cb5cb70b4cb9fac5b3faf51d896b21a10586882104aa4290e2bdbbaa04c');
                const userRes = await db.query('SELECT sector_id FROM users WHERE id = $1', [decoded.id]);
                if (userRes.rowCount > 0) sectorId = userRes.rows[0].sector_id;
            } catch (e) { /* ignore */ }
        }

        if (!sectorId) return res.json([]);

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
        const result = await db.query('DELETE FROM categories WHERE id = $1 AND sector_id = $2', [id, req.user.sector_id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Categoria não encontrada.' });
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Erro ao deletar categoria', error: err.message });
    }
});

module.exports = router;