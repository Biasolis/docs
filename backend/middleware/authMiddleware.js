// /backend/middleware/authMiddleware.js (COMPLETO - MODIFICADO PARA ENV VARS)
const jwt = require('jsonwebtoken');

// Lê o segredo de uma variável de ambiente.
// Define um valor padrão (INSEGURO) apenas para desenvolvimento, caso a variável não exista.
const JWT_SECRET = process.env.JWT_SECRET || 'c8bd8cb5cb70b4cb9fac5b3faf51d896b21a10586882104aa4290e2bdbbaa04c';

if (JWT_SECRET === 'c8bd8cb5cb70b4cb9fac5b3faf51d896b21a10586882104aa4290e2bdbbaa04c' && process.env.NODE_ENV === 'production') {
    console.warn('!!! ATENÇÃO: JWT_SECRET NÃO ESTÁ DEFINIDO NAS VARIÁVEIS DE AMBIENTE. USANDO SEGREDO PADRÃO INSEGURO. !!!');
}

// Middleware para verificar se o token JWT é válido
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido ou expirado.' });
        }
        req.user = user; 
        next();
    });
};

// Middleware para verificar se o usuário é um Admin
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acesso negado. Requer privilégios de administrador.' });
    }
    next();
};

module.exports = {
    verifyToken,
    isAdmin,
    JWT_SECRET // Embora não seja usado externamente, é boa prática exportá-lo se necessário
};