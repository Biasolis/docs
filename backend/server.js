// /backend/server.js (COMPLETO)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
require('./db');

const app = express();
const PORT = process.env.PORT || 3055; 

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3055'], 
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const imagesPath = path.join(__dirname, '..', 'public', 'images');
app.use('/images', express.static(imagesPath));

const frontendDistPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDistPath));

// --- Rotas da API ---
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const articlesRoutes = require('./routes/articles');
const categoriesRoutes = require('./routes/categories');
const sectorsRoutes = require('./routes/sectors'); // NOVO
const aiRoutes = require('./routes/ai'); // NOVO CÉREBRO DE IA

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/articles', articlesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/sectors', sectorsRoutes); // NOVO
app.use('/api/ai', aiRoutes); // REGISTO DA ROTA DA IA


// --- Rota Catch-all ---
app.get(/.*/, (req, res) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/images')) {
        return res.status(404).json({ message: 'Endpoint ou recurso não encontrado.' });
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Servidor backend rodando em http://localhost:${PORT}`); 
});