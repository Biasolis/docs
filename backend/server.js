// /backend/server.js (COMPLETO - PORTA 3055)
const express = require('express');
const cors = require('cors');
const path = require('path');
require('./db'); // Conexão DB

const app = express();
// MUDANÇA AQUI: Define a porta como 3055
const PORT = 3055; 

// --- Middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Servir Arquivos Estáticos ---
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));
app.use('/images', express.static(path.join(publicPath, 'images')));

// --- Rotas da API ---
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const articlesRoutes = require('./routes/articles');
const categoriesRoutes = require('./routes/categories');

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/categories', categoriesRoutes);

// --- Rota Catch-all ---
app.get(/.*/, (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
        return res.status(404).json({ message: 'Endpoint de API não encontrado.' });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

// --- Iniciar Servidor ---
app.listen(PORT, () => {
    // MUDANÇA AQUI: Mensagem no console
    console.log(`Servidor rodando em http://localhost:${PORT}`); 
});