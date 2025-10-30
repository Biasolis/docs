// /public/admin/editor.js (COMPLETO - COM SELEÇÃO DE CATEGORIAS E AUTOSAVE)

// 'token' e 'user' são declarados em 'admin-guard.js'
console.log('editor.js carregado.');

let editor;
let autoSaveInterval; 

try {
    editor = new toastui.Editor({
        el: document.querySelector('#editor'),
        height: '600px',
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        hooks: {
            async addImageBlobHook(blob, callback) { 
                console.log('Iniciando upload...');
                const formData = new FormData(); formData.append('image', blob);
                try {
                    const response = await fetch('/api/articles/upload-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message);
                    console.log('Upload ok:', data.url); callback(data.url, 'Imagem');
                } catch (error) { console.error('Falha upload:', error); alert('Erro upload: ' + error.message); }
             }
        }
    });
    console.log('Editor TUI inicializado.');
} catch (error) { console.error('ERRO FATAL TUI:', error); alert('Erro TUI.'); }

document.addEventListener('DOMContentLoaded', () => {
    
    if (user) document.getElementById('user-welcome').textContent = `Olá, ${user.username}`;
    console.log('DOM carregado.');
    
    const titleInput = document.getElementById('title');
    const statusSelect = document.getElementById('status'); 
    const saveButton = document.getElementById('saveButton');
    const categorySelectorContainer = document.getElementById('categorySelectorContainer'); 

    if (!titleInput || !statusSelect || !saveButton || !editor || !categorySelectorContainer) { 
        console.error('ERRO CRÍTICO: Elementos não encontrados.'); return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const articleId = urlParams.get('id');
    const isEditing = !!articleId;
    const storageKey = `editorDraft_${isEditing ? articleId : 'new'}`;
    console.log('Storage Key:', storageKey);

    const validStatuses = ['draft', 'published_internal', 'published_public'];
    let allCategories = []; 

    // --- Funções de Rascunho ---
    function saveDraft() { 
        if (!editor) return; 
        const selectedCategoryIds = getSelectedCategoryIds(); // Pega categorias
        const draft = {
            title: titleInput.value, status: statusSelect.value, 
            category_ids: selectedCategoryIds, // Salva categorias
            contentMarkdown: editor.getMarkdown(), timestamp: Date.now() 
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
        console.log('Rascunho salvo:', new Date().toLocaleTimeString());
    }
    function loadDraft() { 
        const savedDraft = localStorage.getItem(storageKey);
        if (savedDraft) {
            try {
                const draftData = JSON.parse(savedDraft);
                const savedDate = new Date(draftData.timestamp).toLocaleString('pt-BR');
                if (confirm(`Rascunho salvo em ${savedDate}.\nDeseja restaurá-lo?`)) {
                    titleInput.value = draftData.title;
                    statusSelect.value = validStatuses.includes(draftData.status) ? draftData.status : 'draft'; 
                    editor.setMarkdown(draftData.contentMarkdown);
                    if (draftData.category_ids && Array.isArray(draftData.category_ids)) { // Restaura categorias
                        selectCategories(draftData.category_ids);
                    }
                    console.log('Rascunho restaurado.');
                } else { localStorage.removeItem(storageKey); console.log('Rascunho descartado.'); }
            } catch (e) { console.error('Erro rascunho:', e); localStorage.removeItem(storageKey); }
        } else { console.log('Nenhum rascunho.'); }
     }
    function clearDraft() { localStorage.removeItem(storageKey); console.log('Rascunho limpo.'); if(autoSaveInterval) clearInterval(autoSaveInterval); }

    // --- Funções de Categoria ---
    async function fetchAndRenderCategories() {
        try {
            const response = await fetch('/api/categories', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao carregar categorias.');
            allCategories = await response.json();
            renderCategoryCheckboxes(allCategories);
        } catch (error) { console.error(error); categorySelectorContainer.innerHTML = `<span style="color: red;">${error.message}</span>`; }
    }
    function renderCategoryCheckboxes(categories, parentId = null, level = 0) {
         if (parentId === null) categorySelectorContainer.innerHTML = ''; 
         categories.filter(c => c.parent_id === parentId).forEach(category => {
             const div = document.createElement('div');
             div.className = 'category-checkbox-item';
             div.style.marginLeft = `${level * 20}px`; // Indentação visual
             div.innerHTML = `<label><input type="checkbox" name="category" value="${category.id}"> ${category.name}</label>`;
             categorySelectorContainer.appendChild(div);
             renderCategoryCheckboxes(categories, category.id, level + 1); // Recursão
         });
    }
    function getSelectedCategoryIds() {
        const selected = [];
        categorySelectorContainer.querySelectorAll('input[name="category"]:checked').forEach(cb => selected.push(parseInt(cb.value)));
        return selected;
    }
    function selectCategories(categoryIds) {
        categorySelectorContainer.querySelectorAll('input[name="category"]').forEach(cb => cb.checked = false);
        categoryIds.forEach(id => { const cb = categorySelectorContainer.querySelector(`input[name="category"][value="${id}"]`); if (cb) cb.checked = true; });
    }

    // --- Lógica de Carregamento Principal ---
    async function initializePage() {
        await fetchAndRenderCategories(); // Busca categorias PRIMEIRO
        if (isEditing) {
            console.log('Modo Edição:', articleId);
            await fetchArticleData(articleId); // Espera carregar o artigo
            loadDraft(); 
            if(!autoSaveInterval) autoSaveInterval = setInterval(saveDraft, 10000); 
        } else {
            console.log('Modo Criação.');
            loadDraft(); 
            if(!autoSaveInterval) autoSaveInterval = setInterval(saveDraft, 10000); 
        }
    }

    // --- Função para Buscar Dados do Artigo (Modo Edição) ---
    async function fetchArticleData(id) {
        console.log(`Buscando artigo ${id}...`);
        try {
            // API GET /api/articles/:id agora retorna 'category_ids'
            const response = await fetch(`/api/articles/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Artigo não encontrado.');
            const article = await response.json();
            console.log('Artigo carregado:', article);
            titleInput.value = article.title;
            statusSelect.value = validStatuses.includes(article.status) ? article.status : 'draft';
            editor.setMarkdown(article.content_markdown);
            // Pré-seleciona as categorias
            if (article.category_ids && Array.isArray(article.category_ids)) {
                selectCategories(article.category_ids);
            }
        } catch (error) { console.error(error); alert(error.message); window.location.href = 'dashboard.html'; }
    }

    // --- Event Listener do Botão Salvar ---
    saveButton.addEventListener('click', async () => {
        console.log('Salvar clicado.');
        const title = titleInput.value;
        const status = statusSelect.value; 
        const contentMarkdown = editor.getMarkdown(); 
        const selectedCategoryIds = getSelectedCategoryIds(); // Pega as categorias

        if (!title || !contentMarkdown) { return alert('Título e conteúdo obrigatórios.'); }

        // Envia 'category_ids' para a API
        const articleData = { title, content_markdown: contentMarkdown, status: status, category_ids: selectedCategoryIds }; 
        const apiUrl = isEditing ? `/api/articles/${articleId}` : '/api/articles';
        const apiMethod = isEditing ? 'PUT' : 'POST';
        
        console.log(`Enviando: ${apiMethod} ${apiUrl}`);
        try {
            const response = await fetch(apiUrl, { method: apiMethod, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(articleData) });
            console.log('Resposta API:', response.status);
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro API');
            console.log('API sucesso:', data);
            clearDraft(); 
            alert('Artigo salvo com sucesso!');
            window.location.href = 'dashboard.html';
        } catch (error) { console.error('Falha ao salvar:', error); alert('Erro ao salvar: ' + error.message); }
    });
    
    window.addEventListener('beforeunload', () => { if (autoSaveInterval) clearInterval(autoSaveInterval); });

    // --- Inicializa a página ---
    initializePage(); 

}); // Fim DOMContentLoaded