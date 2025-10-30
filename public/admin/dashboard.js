// /public/admin/dashboard.js (COMPLETO - ATUALIZADO COM 3 STATUS)

// 'token' e 'user' são declarados em 'auth.js'
document.addEventListener('DOMContentLoaded', () => {

    const isAdmin = (user && user.role === 'admin');
    if (user) document.getElementById('user-welcome').textContent = `Olá, ${user.username}`;

    const articlesListBody = document.getElementById('articles-list');
    const logoutButton = document.getElementById('logoutButton');
    const createArticleBtn = document.getElementById('create-article-btn');
    const manageUsersLink = document.getElementById('manage-users-link');
    
    if (!isAdmin) {
        if (createArticleBtn) createArticleBtn.style.display = 'none';
        if (manageUsersLink) manageUsersLink.style.display = 'none';
    }

    // --- Logout ---
    logoutButton.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.replace('/admin/login.html');
    });

    // --- Carregar Artigos ---
    async function carregarArtigos() {
        try {
            // API GET /api/articles agora retorna artigos baseados no role
            const response = await fetch('/api/articles', {
                 method: 'GET',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
             });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) { logoutButton.click(); }
                throw new Error('Falha ao carregar artigos.');
            }
            const articles = await response.json();
            renderizarTabela(articles);
        } catch (error) {
            console.error(error.message);
            articlesListBody.innerHTML = `<tr><td colspan="5">Erro ao carregar artigos.</td></tr>`;
        }
    }

    // --- Renderizar Tabela (LÓGICA DOS 3 STATUS) ---
    function renderizarTabela(articles) {
        articlesListBody.innerHTML = ''; 
        if (articles.length === 0) { 
            const colspan = isAdmin ? 5 : 4; 
            articlesListBody.innerHTML = `<tr><td colspan="${colspan}">Nenhum artigo encontrado.</td></tr>`;
            return; 
        }

        articles.forEach(article => {
            const tr = document.createElement('tr');
            
            // Lógica ATUALIZADA para exibir os 3 status
            let statusHtml;
            switch(article.status) {
                case 'published_public':
                    statusHtml = '<span class="status-publico">Público</span>';
                    break;
                case 'published_internal':
                    statusHtml = '<span class="status-interno">Interno</span>'; 
                    break;
                case 'draft':
                default: // Fallback para rascunho
                    statusHtml = '<span class="status-privado">Rascunho</span>';
                    break;
            }

            // Colunas base
            tr.innerHTML = `
                <td>${article.title}</td>
                <td>${article.author_username}</td>
                <td>${statusHtml}</td> 
                <td>${new Date(article.created_at).toLocaleDateString('pt-BR')}</td>
            `;

            // Coluna Ações
            const actionsTd = document.createElement('td');
            actionsTd.className = 'actions';
            let buttonsHTML = `<a href="/admin/preview.html?id=${article.id}" class="btn-view" target="_blank">Visualizar</a>`;
            if (isAdmin) {
                buttonsHTML += `
                    <button class="btn-edit" data-id="${article.id}">Editar</button>
                    <button class="btn-danger-outline" data-id="${article.id}">Apagar</button>
                `;
            }
            actionsTd.innerHTML = buttonsHTML;
            tr.appendChild(actionsTd); 
            articlesListBody.appendChild(tr);
        });
    }

    // --- Event Listeners Ações ---
    articlesListBody.addEventListener('click', async (event) => { 
        const target = event.target;
        const id = target.dataset.id; 
        if (target.classList.contains('btn-edit')) { window.location.href = `/admin/editor.html?id=${id}`; }
        if (target.classList.contains('btn-danger-outline')) {
            if (confirm(`Tem certeza que deseja apagar o artigo ${id}?`)) {
                try {
                    const response = await fetch(`/api/articles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    if (!response.ok) throw new Error('Falha ao apagar.');
                    carregarArtigos(); 
                } catch (error) { alert(error.message); }
            }
        }
     });

    // --- Carrega Inicial ---
    carregarArtigos();
});