// /backend/routes/sectors.js (COMPLETO E ATUALIZADO)
const express = require('express');
const db = require('../db');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// ROTA PÚBLICA: Lista todos os setores para o Hub Principal
// Incluído ai_active para que o Chatbot apareça corretamente no Frontend
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, slug, description, ai_active FROM sectors ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// ROTAS PROTEGIDAS (Apenas Super Admin gerencia a existência de setores)
router.use(verifyToken, isSuperAdmin);

router.post('/', async (req, res) => {
    const { name, slug, description } = req.body;
    if (!name || !slug) return res.status(400).json({ message: 'Nome e slug são obrigatórios.' });

    try {
        const result = await db.query(
            'INSERT INTO sectors (name, slug, description) VALUES ($1, $2, $3) RETURNING *',
            [name, slug.toLowerCase(), description]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ message: 'Este Slug já está em uso.' });
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, slug, description } = req.body;

    try {
        const result = await db.query(
            'UPDATE sectors SET name=$1, slug=$2, description=$3 WHERE id=$4 RETURNING *',
            [name, slug.toLowerCase(), description, id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Setor não encontrado.' });
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ message: 'Este Slug já está em uso.' });
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM sectors WHERE id=$1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Setor não encontrado.' });
        res.status(204).send();
    } catch (err) {
        // Erro 23503 é violação de Foreign Key (ex: tem artigos ligados ao setor)
        if (err.code === '23503') return res.status(400).json({ message: 'Não pode apagar um setor que contém artigos, categorias ou utilizadores.'});
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

module.exports = router;