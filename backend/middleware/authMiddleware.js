// /backend/middleware/authMiddleware.js (COMPLETO)
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'c8bd8cb5cb70b4cb9fac5b3faf51d896b21a10586882104aa4290e2bdbbaa04c';

if (JWT_SECRET === 'c8bd8cb5cb70b4cb9fac5b3faf51d896b21a10586882104aa4290e2bdbbaa04c' && process.env.NODE_ENV === 'production') {
    console.warn('!!! ATENÇÃO: JWT_SECRET NÃO ESTÁ DEFINIDO. !!!');
}

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Token inválido ou expirado.' });
        
        try {
            // Vai sempre buscar o cargo e o setor atualizados ao Banco de Dados!
            const userRes = await db.query('SELECT id, role, sector_id FROM users WHERE id = $1', [decoded.id]);
            if (userRes.rowCount === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });
            
            req.user = userRes.rows[0]; 
            next();
        } catch (dbErr) {
            res.status(500).json({ message: 'Erro ao verificar utilizador.' });
        }
    });
};

const isSuperAdmin = (req, res, next) => {
    if (req.user.role !== 'super_admin') return res.status(403).json({ message: 'Requer privilégios de Super Admin.' });
    next();
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ message: 'Requer privilégios de Administrador.' });
    next();
};

const isEditor = (req, res, next) => {
    if (req.user.role !== 'editor' && req.user.role !== 'admin' && req.user.role !== 'super_admin') return res.status(403).json({ message: 'Requer privilégios de Editor.' });
    next();
};

module.exports = { verifyToken, isSuperAdmin, isAdmin, isEditor, JWT_SECRET };