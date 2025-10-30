// /backend/routes/users.js (ATUALIZADO)
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// --- ROTAS DO PRÓPRIO USUÁRIO (Requer login, mas NÃO admin) ---
// (Estas rotas vêm ANTES do 'router.use(verifyToken, isAdmin)')

// ROTA: GET /api/users/me (Pega os dados do usuário logado)
router.get('/me', verifyToken, async (req, res) => {
    try {
        // req.user.id vem do token
        const result = await db.query('SELECT id, username, email FROM users WHERE id = $1', [req.user.id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// ROTA: PUT /api/users/me (Atualiza o próprio perfil)
router.put('/me', verifyToken, async (req, res) => {
    // Note: 'email' NÃO é permitido, apenas username e password
    const { username, password } = req.body; 
    const id = req.user.id; // Pega o ID do token

    if (!username) {
        return res.status(400).json({ message: 'Nome de usuário é obrigatório.' });
    }

    try {
        let query, params;

        if (password) {
            // Se uma nova senha foi fornecida
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            query = 'UPDATE users SET username = $1, password_hash = $2 WHERE id = $3 RETURNING id, username, email, role';
            params = [username, password_hash, id];
        } else {
            // Se a senha NÃO foi alterada
            query = 'UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email, role';
            params = [username, id];
        }

        const result = await db.query(query, params);
        const updatedUser = result.rows[0];

        res.json({
            message: "Perfil atualizado com sucesso!",
            // Envia os dados atualizados para o frontend
            user: { id: updatedUser.id, username: updatedUser.username, role: updatedUser.role }
        });

    } catch (err) {
         if (err.code === '23505' && err.constraint === 'users_username_key') {
             return res.status(409).json({ message: 'Este nome de usuário já existe.' });
         }
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});


// --- ROTAS DE ADMINISTRAÇÃO (Requer Admin) ---
// (Esta linha garante que todas as rotas ABAIXO dela exigem admin)
router.use(verifyToken, isAdmin);

// ROTA: GET /api/users (Listar)
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT id, username, email, role, created_at FROM users ORDER BY username');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// ROTA: POST /api/users (Criar)
router.post('/', async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
        return res.status(400).json({ message: 'Username, email, password e role são obrigatórios.' });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const result = await db.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
            [username, email, password_hash, role]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { 
            if (err.constraint === 'users_email_unique') {
                return res.status(409).json({ message: 'Este e-mail já está em uso.' });
            }
            if (err.constraint === 'users_username_key') {
                return res.status(409).json({ message: 'Este nome de usuário já existe.' });
            }
        }
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// ROTA: PUT /api/users/:id (Editar)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { username, email, role, password } = req.body; 

    try {
        let query;
        let params;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            const password_hash = await bcrypt.hash(password, salt);
            query = 'UPDATE users SET username = $1, email = $2, role = $3, password_hash = $4 WHERE id = $5 RETURNING id, username, email, role';
            params = [username, email, role, password_hash, id];
        } else {
            query = 'UPDATE users SET username = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, username, email, role';
            params = [username, email, role, id];
        }

        const result = await db.query(query, params);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.json(result.rows[0]);

    } catch (err) {
        if (err.code === '23505') { 
            if (err.constraint === 'users_email_unique') {
                return res.status(409).json({ message: 'Este e-mail já está em uso.' });
            }
            if (err.constraint === 'users_username_key') {
                return res.status(409).json({ message: 'Este nome de usuário já existe.' });
            }
        }
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

// ROTA: DELETE /api/users/:id (Apagar)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    if (req.user.id == id) {
        return res.status(403).json({ message: 'Você não pode apagar a si mesmo.' });
    }
    try {
        const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        res.status(204).send(); 
    } catch (err) {
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

module.exports = router;