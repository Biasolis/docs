// /backend/routes/users.js (COMPLETO E COM ERROS ESPECÍFICOS)
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// --- ROTAS DO PRÓPRIO USUÁRIO ---
router.get('/me', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT u.id, u.username, u.email, u.role, u.sector_id, s.name as sector_name FROM users u LEFT JOIN sectors s ON u.sector_id = s.id WHERE u.id = $1', 
            [req.user.id]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

router.put('/me', verifyToken, async (req, res) => {
    const { username, password } = req.body; 
    const id = req.user.id;

    if (!username) return res.status(400).json({ message: 'Nome de usuário é obrigatório.' });

    try {
        let query, params;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            query = 'UPDATE users SET username = $1, password_hash = $2 WHERE id = $3 RETURNING id, username, email, role, sector_id';
            params = [username, password_hash, id];
        } else {
            query = 'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email, role, sector_id';
            params = [username, id];
        }

        const result = await db.query(query, params);
        res.json({ message: "Perfil atualizado!", user: result.rows[0] });
    } catch (err) {
         if (err.code === '23505') return res.status(409).json({ message: 'Este nome de usuário já existe.' });
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// --- ROTAS DE ADMINISTRAÇÃO (Apenas Admin e Super Admin) ---
router.use(verifyToken, isAdmin);

router.get('/', async (req, res) => {
    try {
        let query = `
            SELECT u.id, u.username, u.email, u.role, u.sector_id, u.created_at, s.name as sector_name 
            FROM users u LEFT JOIN sectors s ON u.sector_id = s.id
        `;
        let params = [];

        // Admin normal só vê os usuários do seu setor. Super admin vê todos.
        if (req.user.role !== 'super_admin') {
            query += ' WHERE u.sector_id = $1 ORDER BY u.username';
            params = [req.user.sector_id];
        } else {
            query += ' ORDER BY u.username';
        }

        const result = await db.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { username, email, password, role, sector_id } = req.body;
    if (!username || !email || !password || !role) return res.status(400).json({ message: 'Dados obrigatórios em falta.' });

    let finalSectorId = req.user.sector_id; // Admin cria sempre no seu setor
    if (req.user.role === 'super_admin' && sector_id) finalSectorId = sector_id;

    if (req.user.role !== 'super_admin' && role === 'super_admin') {
        return res.status(403).json({ message: 'Apenas Super Admins podem criar Super Admins.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await db.query(
            'INSERT INTO users (username, email, password_hash, role, sector_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role',
            [username, email, password_hash, role, finalSectorId || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            // Verifica qual foi o campo que causou o erro 23505
            if (err.constraint === 'users_email_key' || err.constraint === 'users_email_unique') {
                return res.status(409).json({ message: 'Este e-mail já está registado.' });
            } else if (err.constraint === 'users_username_key') {
                return res.status(409).json({ message: 'Este Nome de Exibição já está a ser utilizado por outro utilizador.' });
            }
            return res.status(409).json({ message: 'E-mail ou utilizador já em uso.' });
        }
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { username, email, role, password, sector_id } = req.body; 

    try {
        if (req.user.role !== 'super_admin') {
            const targetUser = await db.query('SELECT sector_id FROM users WHERE id = $1', [id]);
            if (targetUser.rowCount === 0 || targetUser.rows[0].sector_id !== req.user.sector_id) {
                return res.status(403).json({ message: 'Não pode editar utilizadores de outro setor.' });
            }
            if (role === 'super_admin') return res.status(403).json({ message: 'Apenas Super Admins definem Super Admins.' });
        }

        let finalSectorId = (req.user.role === 'super_admin' && sector_id) ? sector_id : req.user.sector_id;
        let query, params;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            query = 'UPDATE users SET username=$1, email=$2, role=$3, password_hash=$4, sector_id=$5 WHERE id=$6 RETURNING id, username, email, role';
            params = [username, email, role, password_hash, finalSectorId || null, id];
        } else {
            query = 'UPDATE users SET username=$1, email=$2, role=$3, sector_id=$4 WHERE id=$5 RETURNING id, username, email, role';
            params = [username, email, role, finalSectorId || null, id];
        }

        const result = await db.query(query, params);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.json(result.rows[0]);

    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint === 'users_email_key' || err.constraint === 'users_email_unique') {
                return res.status(409).json({ message: 'Este e-mail já está registado noutra conta.' });
            } else if (err.constraint === 'users_username_key') {
                return res.status(409).json({ message: 'Este Nome de Exibição já está a ser utilizado.' });
            }
            return res.status(409).json({ message: 'E-mail ou utilizador já em uso.' });
        }
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    if (req.user.id == id) return res.status(403).json({ message: 'Você não pode apagar a si mesmo.' });
    
    try {
        if (req.user.role !== 'super_admin') {
            const targetUser = await db.query('SELECT sector_id FROM users WHERE id = $1', [id]);
            if (targetUser.rowCount === 0 || targetUser.rows[0].sector_id !== req.user.sector_id) {
                return res.status(403).json({ message: 'Não pode apagar utilizadores de outro setor.' });
            }
        }
        const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
        if (result.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
        res.status(204).send(); 
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

module.exports = router;