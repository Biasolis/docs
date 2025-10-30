// /backend/routes/auth.js (ATUALIZADO)
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

// ROTA: POST /api/auth/login
router.post('/login', async (req, res) => {
    // MUDANÇA AQUI: Sai 'username', entra 'email'
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    try {
        // MUDANÇA AQUI: Busca por 'email'
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            // MUDANÇA AQUI: Mensagem de erro
            return res.status(401).json({ message: 'Email não encontrado.' });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ message: 'Senha incorreta.' });
        }

        // O token continua igual, enviando o 'username' como nome de exibição
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ 
            message: 'Login bem-sucedido!', 
            token, 
            user: { id: user.id, username: user.username, role: user.role } 
        });

    } catch (err) {
        console.error('Erro no login:', err.message);
        res.status(500).json({ message: 'Erro no servidor', error: err.message });
    }
});

module.exports = router;