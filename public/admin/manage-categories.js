// /public/admin/manage-categories.js (NOVO ARQUIVO)

// 'token' e 'user' são declarados em 'admin-guard.js'
document.addEventListener('DOMContentLoaded', () => {

    if (user) document.getElementById('user-welcome').textContent = `Olá, ${user.username}`;
    
    // Elementos do Formulário
    const categoryForm = document.getElementById('categoryForm');
    const formTitle = document.getElementById('formTitle');
    const categoryIdInput = document.getElementById('categoryId');
    const categoryNameInput = document.getElementById('categoryName');
    const parentIdSelect = document.getElementById('parentId');
    const cancelButton = document.getElementById('cancelButton');
    const categoryMessage = document.getElementById('categoryMessage');

    // Elementos da Lista
    const categoryListUl = document.getElementById('category-list');

    let allCategories = []; // Guarda a lista plana de categorias

    // --- 1. Função para Buscar Todas as Categorias (Lista Plana) ---
    async function fetchAllCategories() {
        categoryListUl.innerHTML = '<li>Carregando...</li>';
        parentIdSelect.innerHTML = '<option value="">-- Carregando... --</option>'; // Feedback no select
        try {
            const response = await fetch('/api/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Falha ao carregar categorias.');
            
            allCategories = await response.json();
            renderCategoryTree(allCategories);
            populateParentSelect(allCategories);

        } catch (error) {
            console.error(error);
            categoryListUl.innerHTML = `<li style="color: red;">${error.message}</li>`;
            parentIdSelect.innerHTML = '<option value="">-- Erro ao carregar --</option>';
        }
    }

    // --- 2. Função para Renderizar a Árvore de Categorias ---
    function renderCategoryTree(categories, parentId = null, level = 0) {
        // Encontra filhas diretas do parentId atual
        const children = categories.filter(cat => cat.parent_id === parentId);
        
        if (level === 0) categoryListUl.innerHTML = ''; // Limpa a lista principal no início
        
        children.forEach(category => {
            const li = document.createElement('li');
            li.style.marginLeft = `${level * 20}px`; // Indentação para subcategorias
            
            // Texto e botões
            li.innerHTML = `
                <span>${category.name} (ID: ${category.id})</span>
                <div class="category-actions">
                    <button class="btn-edit-cat" data-id="${category.id}" data-name="${category.name}" data-parentid="${category.parent_id || ''}">Editar</button>
                    <button class="btn-delete-cat" data-id="${category.id}">Apagar</button>
                </div>
            `;
            categoryListUl.appendChild(li);

            // Chama recursivamente para as filhas desta categoria
            renderCategoryTree(categories, category.id, level + 1);
        });

        // Mensagem se a lista raiz estiver vazia
         if (level === 0 && children.length === 0 && categories.length > 0) {
             categoryListUl.innerHTML = '<li>Nenhuma categoria raiz encontrada.</li>';
         } else if (categories.length === 0) {
             categoryListUl.innerHTML = '<li>Nenhuma categoria cadastrada.</li>';
         }
    }

    // --- 3. Função para Popular o Select de Categoria Pai ---
    function populateParentSelect(categories, editingCategoryId = null) {
         parentIdSelect.innerHTML = '<option value="">-- Nenhuma (Categoria Raiz) --</option>'; // Opção padrão
         
         // Função auxiliar para adicionar opções recursivamente com indentação
         const addOptions = (cats, parentId = null, indent = '') => {
             cats.filter(c => c.parent_id === parentId).forEach(category => {
                 // Não permite selecionar a si mesma ou suas filhas como pai durante a edição
                 if (editingCategoryId === null || (category.id !== editingCategoryId && !isDescendant(cats, category.id, editingCategoryId))) {
                     const option = document.createElement('option');
                     option.value = category.id;
                     option.textContent = `${indent}${category.name}`;
                     parentIdSelect.appendChild(option);
                     addOptions(cats, category.id, `${indent}-- `); // Adiciona indentação para subcategorias
                 }
             });
         };
         
         addOptions(categories);
    }
    
    // (NOVO) Função auxiliar para verificar se uma categoria é descendente de outra (evita loops)
    function isDescendant(categories, childId, potentialParentId) {
        const child = categories.find(c => c.id === childId);
        if (!child || !child.parent_id) return false; // Não tem pai, não pode ser descendente
        if (child.parent_id === potentialParentId) return true; // É filha direta
        return isDescendant(categories, child.parent_id, potentialParentId); // Verifica os avós, etc.
    }


    // --- 4. Event Listener do Formulário (Salvar) ---
    categoryForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        categoryMessage.textContent = ''; // Limpa mensagens

        const id = categoryIdInput.value;
        const isEditing = !!id;
        const name = categoryNameInput.value;
        const parent_id = parentIdSelect.value || null; // Envia null se vazio

        const apiUrl = isEditing ? `/api/categories/${id}` : '/api/categories';
        const apiMethod = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(apiUrl, {
                method: apiMethod,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ name, parent_id })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao salvar categoria.');

            categoryMessage.textContent = 'Categoria salva com sucesso!';
            categoryMessage.className = 'feedback-message success';
            resetForm();
            fetchAllCategories(); // Recarrega a lista

        } catch (error) {
            categoryMessage.textContent = error.message;
            categoryMessage.className = 'feedback-message error';
        }
    });

    // --- 5. Event Listeners da Lista (Editar/Apagar) ---
    categoryListUl.addEventListener('click', async (event) => {
        const target = event.target;
        const id = target.dataset.id;

        // --- Ação de Editar ---
        if (target.classList.contains('btn-edit-cat')) {
            formTitle.textContent = 'Editar Categoria';
            categoryIdInput.value = id;
            categoryNameInput.value = target.dataset.name;
            // Repopula o select EXCLUINDO a categoria atual e suas filhas
            populateParentSelect(allCategories, parseInt(id)); 
            parentIdSelect.value = target.dataset.parentid || ''; // Seta o pai atual
            cancelButton.style.display = 'inline-block';
            categoryMessage.textContent = '';
            window.scrollTo(0, 0); 
        }

        // --- Ação de Apagar ---
        if (target.classList.contains('btn-delete-cat')) {
             // Verifica se a categoria tem filhas
            const hasChildren = allCategories.some(cat => cat.parent_id === parseInt(id));
            let confirmMessage = `Tem certeza que deseja apagar a categoria ${id}?`;
            if (hasChildren) {
                confirmMessage += "\n\nAVISO: Esta categoria possui subcategorias. Ao apagá-la, as subcategorias se tornarão categorias raiz.";
            }

            if (confirm(confirmMessage)) {
                try {
                    const response = await fetch(`/api/categories/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) {
                        // Tenta pegar a mensagem de erro da API
                        let errorMsg = 'Falha ao apagar categoria.';
                        try {
                            const data = await response.json();
                            errorMsg = data.message || errorMsg;
                        } catch (e) { /* Ignora erro no parse */ }
                        throw new Error(errorMsg);
                    }
                    
                    categoryMessage.textContent = 'Categoria apagada com sucesso!';
                    categoryMessage.className = 'feedback-message success';
                    fetchAllCategories(); // Recarrega

                } catch (error) {
                    categoryMessage.textContent = error.message;
                    categoryMessage.className = 'feedback-message error';
                }
            }
        }
    });

    // --- 6. Ações dos Botões do Formulário ---
    function resetForm() {
        formTitle.textContent = 'Adicionar Nova Categoria';
        categoryForm.reset(); 
        categoryIdInput.value = ''; 
        populateParentSelect(allCategories); // Repopula o select sem restrições
        cancelButton.style.display = 'none';
    }
    cancelButton.addEventListener('click', resetForm);

    // --- 7. Carrega tudo ao iniciar ---
    fetchAllCategories();
});