// /backend/routes/categories.js (COMPLETO - ROTAS GET PÚBLICAS)
const express = require('express');
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// --- Rotas Públicas (NÃO REQUEREM LOGIN) ---

// ROTA: GET /api/categories/tree (Retorna a estrutura de árvore aninhada)
// Usada pela página pública (public.js) para renderizar a sidebar
router.get('/tree', async (req, res) => {
    try {
        // Busca todas as categorias
        const result = await db.query('SELECT id, name, parent_id FROM categories ORDER BY name');
        
        // Função auxiliar para construir a árvore recursivamente
        const buildTree = (categories, parentId = null) => {
            const nodes = [];
            // Itera sobre a lista completa de categorias
            for (const category of categories) {
                if (category.parent_id === parentId) {
                    // Encontra filhas da categoria atual, passando a lista completa
                    const children = buildTree(categories, category.id);
                    const node = { ...category }; // Copia a categoria
                    if (children.length > 0) {
                        node.children = children; // Adiciona subcategorias
                    }
                    nodes.push(node);
                }
            }
            return nodes;
        };

        // Inicia a construção da árvore a partir do nível raiz (parentId = null)
        const categoryTree = buildTree(result.rows);
        res.json(categoryTree);

    } catch (err) {
        console.error("Erro em GET /api/categories/tree:", err);
        res.status(500).json({ message: 'Erro ao buscar árvore de categorias', error: err.message });
    }
});

// ROTA: GET /api/categories (Listar todas as categorias - flat list)
// Usada pelo painel de admin (manage-categories.js) e (editor.js)
// Tornada PÚBLICA (movida para cima) para que public.js também possa usar (se necessário)
router.get('/', async (req, res) => {
    try {
        // Retorna uma lista simples para o gerenciamento
        const result = await db.query('SELECT id, name, parent_id FROM categories ORDER BY name');
        res.json(result.rows);
    } catch (err)
 {
        console.error("Erro em GET /api/categories:", err);
        res.status(500).json({ message: 'Erro ao listar categorias', error: err.message });
    }
});


// --- Rotas de Administração (Requer Admin) ---
// (Esta linha protege TODAS as rotas abaixo dela)
router.use(verifyToken, isAdmin);

// ROTA: POST /api/categories (Criar nova categoria)
router.post('/', async (req, res) => {
    const { name, parent_id } = req.body; 

    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Nome da categoria é obrigatório.' });
    }

    try {
        const result = await db.query(
            'INSERT INTO categories (name, parent_id) VALUES ($1, $2) RETURNING *',
            [name.trim(), parent_id || null] // Garante que parent_id é null se não fornecido
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro em POST /api/categories:", err);
        res.status(500).json({ message: 'Erro ao criar categoria', error: err.message });
    }
});

// ROTA: PUT /api/categories/:id (Editar categoria)
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, parent_id } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Nome da categoria é obrigatório.' });
    }
    // Prevenir auto-referência
    if (id == parent_id) {
         return res.status(400).json({ message: 'Uma categoria não pode ser pai dela mesma.' });
    }

    try {
        // TODO: Adicionar lógica para prevenir loops (ex: A pai de B, B pai de A)
        
        const result = await db.query(
            'UPDATE categories SET name = $1, parent_id = $2 WHERE id = $3 RETURNING *',
            [name.trim(), parent_id || null, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Categoria não encontrada.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`Erro em PUT /api/categories/${id}:`, err);
        res.status(500).json({ message: 'Erro ao atualizar categoria', error: err.message });
    }
});

// ROTA: DELETE /api/categories/:id (Apagar categoria)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // O DB foi configurado com ON DELETE SET NULL para parent_id
        // e ON DELETE CASCADE para article_categories, então isso é seguro.
        const result = await db.query('DELETE FROM categories WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Categoria não encontrada.' });
        }
        res.status(204).send(); // Sucesso sem conteúdo
    } catch (err) {
        console.error(`Erro em DELETE /api/categories/${id}:`, err);
        res.status(500).json({ message: 'Erro ao deletar categoria', error: err.message });
    }
});


module.exports = router;