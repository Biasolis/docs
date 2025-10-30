// /public/public.js (SIMPLIFICADO - SEM MARKED.JS)

// --- Função Auxiliar (Copy Button) ---
function initCopyCodeButtons() {
    const codeBlocks = document.querySelectorAll('.content pre');
    codeBlocks.forEach(block => {
        const oldButton = block.querySelector('.copy-code-btn');
        if(oldButton) oldButton.remove(); // Remove botão antigo se existir

        const button = document.createElement('button');
        button.className = 'copy-code-btn';
        button.textContent = 'Copiar';
        button.addEventListener('click', () => {
            const codeElement = block.querySelector('code');
            const codeToCopy = codeElement ? codeElement.innerText : block.innerText; 
            navigator.clipboard.writeText(codeToCopy).then(() => {
                button.textContent = 'Copiado!';
                setTimeout(() => { button.textContent = 'Copiar'; }, 2000);
            }, (err) => { 
                console.error('Erro ao copiar:', err);
                button.textContent = 'Erro!'; 
            });
        });
        block.appendChild(button);
    });
}

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Carregado - public.js iniciado (Modo SSR).");
    
    // Seleção de Elementos
    const searchInput = document.getElementById('searchInput');
    const categoryTreeContainer = document.getElementById('category-tree-container');
    const contentArea = document.querySelector('.content');

    // Variáveis de Estado
    let currentArticles = []; // Artigos atualmente exibidos
    let currentCategoryTree = []; // Lista plana de categorias
    let activeArticleId = null; // ID do artigo ativo (ex: "#artigo-5")

    // --- Renderizar Árvore da Sidebar ---
    function renderSidebarTree(categoriesData, parentId = null) {
        const ul = document.createElement('ul');
        if (parentId === null) ul.className = 'category-tree-public';

        if (parentId === null) {
             const liAll = document.createElement('li');
             const aAll = document.createElement('a'); aAll.href = '#all';
             aAll.textContent = 'Todos os Artigos'; aAll.classList.add('all-articles-link');
             liAll.appendChild(aAll); ul.appendChild(liAll);
        }

        const children = categoriesData.filter(cat => cat.parent_id === parentId);
        
        children.forEach(category => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#category-${category.id}`; 
            a.dataset.categoryId = category.id;
            a.textContent = category.name; 
            li.appendChild(a);

            const subUl = renderSidebarTree(categoriesData, category.id);
            if (subUl.hasChildNodes()) {
                li.appendChild(subUl);
            }
            ul.appendChild(li);
        });
        return ul;
    }


    // --- Renderizar Artigos no Conteúdo (COM SNIPPET) ---
    function renderArticlesContent(articles) {
        contentArea.innerHTML = '';
        
        if (!articles || articles.length === 0) {
            const searchTerm = searchInput.value.trim();
            contentArea.innerHTML = searchTerm !== '' ? '<p>Nenhum resultado encontrado para sua busca.</p>' : '<p>Nenhum documento encontrado para esta seleção.</p>';
            updateArticleSelection(null);
            return;
        }

        articles.forEach((article) => {
            const articleId = `artigo-${article.id}`;
            const section = document.createElement('section');
            section.id = articleId; 
            section.classList.add('doc-section');

            let contentHtml = '';
            
            if (article.snippet) {
                 // Snippet já vem como HTML da API de busca
                 contentHtml = `<p class="search-snippet">...${article.snippet}...</p>`;
                 section.dataset.needsContent = "true"; // Sinaliza que precisa buscar o conteúdo completo
            } else {
                // content_html agora vem pronto da API
                contentHtml = article.content_html || '<p>Conteúdo indisponível.</p>';
                section.dataset.needsContent = "false";
            }

            section.innerHTML = `<h2>${article.title}</h2>${contentHtml}<p class="article-author"><em>Autor: ${article.author_username} (Publicado em: ${new Date(article.created_at).toLocaleDateString('pt-BR')})</em></p>`;
            contentArea.appendChild(section);
            section.style.display = 'none';
        });
        
        if(articles.length > 0) {
            const firstArticleId = `artigo-${articles[0].id}`;
            updateArticleSelection(`#${firstArticleId}`);
        } else {
             updateArticleSelection(null);
        }
    }

    // --- Buscar Artigos na API e Exibir ---
    async function fetchAndDisplayArticles(filterType = 'all', value = '') {
        let apiUrl = '';
        contentArea.innerHTML = '<p>Carregando...</p>'; 

        try {
            if (filterType === 'search') apiUrl = `/api/articles/search?q=${encodeURIComponent(value)}`;
            else if (filterType === 'category') apiUrl = `/api/articles/category/${value}`;
            else apiUrl = '/api/articles/public';
            
            console.log("Buscando artigos em:", apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Erro na API (${response.status}) ao buscar artigos`);
            
            currentArticles = await response.json(); 
            console.log("Artigos recebidos:", currentArticles.length);
            renderArticlesContent(currentArticles); 
            
            if (filterType !== 'search') { 
                updateSidebarSelection(filterType === 'all' ? null : parseInt(value));
            }

        } catch (error) {
            console.error('Erro ao buscar/renderizar artigos:', error);
            contentArea.innerHTML = `<p style="color: red;"><strong>Erro ao buscar documentos.</strong> (${error.message})</p>`;
            updateArticleSelection(null); 
        }
    }
    
    // --- Atualizar Seleção Visual da Categoria na Sidebar ---
    function updateSidebarSelection(activeCategoryId = null) {
        if (!categoryTreeContainer) return; 
        categoryTreeContainer.querySelectorAll('a').forEach(a => {
            a.classList.remove('active-category');
            if ((a.hash === '#all' && activeCategoryId === null) || 
                (a.dataset.categoryId && parseInt(a.dataset.categoryId) === activeCategoryId)) {
                a.classList.add('active-category');
            }
        });
    }
    
    // --- Ativar/Mostrar um Artigo Específico (Busca conteúdo se necessário) ---
    async function updateArticleSelection(targetArticleId = null) {
         console.log("Tentando ativar artigo:", targetArticleId);
         const currentActiveSection = contentArea.querySelector('.doc-section.active');
         if (currentActiveSection) { 
             currentActiveSection.classList.remove('active');
             currentActiveSection.style.display = 'none';
         }

         activeArticleId = targetArticleId;
         
         if (targetArticleId) {
             const newActiveSection = contentArea.querySelector(targetArticleId);
             if (newActiveSection) {
                 if (newActiveSection.dataset.needsContent === "true") {
                     console.log(`Buscando conteúdo completo para ${targetArticleId}...`);
                     const articleIdNum = targetArticleId.split('-')[1]; 
                     try {
                         const response = await fetch(`/api/articles/public/${articleIdNum}`); 
                         if (!response.ok) { /* ... (tratamento de erro) ... */ }
                         const articleData = await response.json();
                         
                         // Pega o HTML pronto da API
                         const fullContentHtml = articleData.content_html || '';
                         const h2 = newActiveSection.querySelector('h2');
                         const authorP = newActiveSection.querySelector('p.article-author');
                         
                         newActiveSection.innerHTML = ''; 
                         if (h2) newActiveSection.appendChild(h2);
                         const contentDiv = document.createElement('div');
                         contentDiv.innerHTML = fullContentHtml;
                         newActiveSection.appendChild(contentDiv);
                         if (authorP) newActiveSection.appendChild(authorP);

                         newActiveSection.dataset.needsContent = "false";
                         initCopyCodeButtons();

                     } catch (error) {
                          console.error("Erro ao buscar conteúdo completo:", error);
                          // ... (tratamento de erro) ...
                     }
                 } else {
                     initCopyCodeButtons(); // Adiciona botões se o conteúdo já estava lá
                 }
                 
                 newActiveSection.classList.add('active');
                 newActiveSection.style.display = 'block';

             } else {
                  console.warn(`Seção ${targetArticleId} não encontrada no DOM.`);
                  activeArticleId = null; 
             }
         }
    }


    // --- Lógica da Busca ---
    let searchTimeout; 
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchAndDisplayArticles(searchTerm === '' ? 'all' : 'search', searchTerm);
            updateSidebarSelection(null); 
            const allLink = categoryTreeContainer?.querySelector('a.all-articles-link'); 
            if(allLink) allLink.classList.toggle('active-category', searchTerm === ''); 
        }, 300); 
    });

    // --- Lógica de Clique na Categoria ---
    if(categoryTreeContainer) { 
        categoryTreeContainer.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link) {
                e.preventDefault();
                const categoryId = link.dataset.categoryId;
                searchInput.value = ''; 
                fetchAndDisplayArticles(link.hash === '#all' ? 'all' : 'category', categoryId);
            }
        });
    }
    
     // --- Lógica de Clique nos Links Internos (#artigo-ID) ---
     contentArea.addEventListener('click', (e) => {
         const internalLink = e.target.closest('a.internal-link');
         if (internalLink && internalLink.getAttribute('href')?.startsWith('#artigo-')) {
             e.preventDefault();
             const targetId = internalLink.getAttribute('href');
             const targetSection = contentArea.querySelector(targetId);
             if (targetSection) {
                 updateArticleSelection(targetId); 
                 targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
             } else {
                  console.warn(`Link interno para ${targetId} não encontrado.`);
             }
         }
     });

    // --- Carregamento Inicial ---
    async function initializePage() {
         if(categoryTreeContainer) categoryTreeContainer.innerHTML = 'Carregando categorias...';

         try {
             // 1. Busca a lista plana de categorias
             const flatCatResponse = await fetch('/api/categories'); 
             if (!flatCatResponse.ok) throw new Error(`Erro categorias (${flatCatResponse.status})`);
             const flatCategories = await flatCatResponse.json();
             currentCategoryTree = flatCategories; 

             const treeUl = renderSidebarTree(flatCategories);
             if(categoryTreeContainer) {
                 categoryTreeContainer.innerHTML = ''; 
                 categoryTreeContainer.appendChild(treeUl);
             }

             // 2. Busca e exibe todos os artigos inicialmente
             // (Não precisamos mais buscar o mapa de títulos!)
             await fetchAndDisplayArticles('all');

         } catch (error) {
              console.error("Erro inicialização:", error);
              if(categoryTreeContainer) categoryTreeContainer.innerHTML = `<span style="color: red;">${error.message}</span>`;
              contentArea.innerHTML = '<p>Erro ao carregar a página.</p>';
         }
    }

    initializePage(); 

}); // Fim DOMContentLoaded