// /backend/routes/sectors.js (COMPLETO)
const express = require('express');
const db = require('../db');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // ESSENCIAL: Adicionado ai_active para o Frontend público
        const result = await db.query('SELECT id, name, slug, description, ai_active FROM sectors ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

router.use(verifyToken, isSuperAdmin);

router.post('/', async (req, res) => {
    const { name, slug, description } = req.body;
    try {
        const result = await db.query('INSERT INTO sectors (name, slug, description) VALUES ($1, $2, $3) RETURNING *', [name, slug.toLowerCase(), description]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') return res.status(409).json({ message: 'Slug em uso.' });
        res.status(500).json({ message: 'Erro servidor', error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, slug, description } = req.body;
    try {
        const result = await db.query('UPDATE sectors SET name=$1, slug=$2, description=$3 WHERE id=$4 RETURNING *', [name, slug.toLowerCase(), description, id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ message: 'Erro', error: err.message }); }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM sectors WHERE id=$1', [id]);
        res.status(204).send();
    } catch (err) { res.status(500).json({ message: 'Erro', error: err.message }); }
});

module.exports = router;