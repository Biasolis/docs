// /public/public.js (ATUALIZADO - Com Lista/Índice de Artigos)

// --- Função Auxiliar (Copy Button) ---
function initCopyCodeButtons() {
    const codeBlocks = document.querySelectorAll('.content pre');
    codeBlocks.forEach(block => {
        const oldButton = block.querySelector('.copy-code-btn');
        if(oldButton) oldButton.remove(); 

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
    let currentArticles = [];
    let currentCategoryTree = [];
    let activeArticleId = null; 

    // --- Renderizar Árvore da Sidebar ---
    function renderSidebarTree(categoriesData, parentId = null) {
        // ... (Esta função não muda) ...
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

    // --- Renderizar O CONTEÚDO (as seções escondidas) ---
    // (Esta função foi simplificada para apenas ADICIONAR seções)
    function renderArticleSections(articles) {
        if (!articles || articles.length === 0) {
            return; // O índice já terá a mensagem de "nenhum"
        }

        articles.forEach((article) => {
            const articleId = `artigo-${article.id}`;
            const section = document.createElement('section');
            section.id = articleId; 
            section.classList.add('doc-section');
            
            // content_html agora vem pronto da API
            let contentHtml = article.content_html || '<p>Conteúdo indisponível.</p>';
            
            // Se for resultado de busca (snippet), o conteúdo completo precisa ser buscado
            if (article.snippet) {
                 contentHtml = `<p class"search-snippet-placeholder">Carregando...</p>`;
                 section.dataset.needsContent = "true";
            } else {
                 section.dataset.needsContent = "false";
            }

            section.innerHTML = `<h2>${article.title}</h2>${contentHtml}<p class="article-author"><em>Autor: ${article.author_username} (Publicado em: ${new Date(article.created_at).toLocaleDateString('pt-BR')})</em></p>`;
            contentArea.appendChild(section); // Adiciona a seção
            section.style.display = 'none'; // Esconde
        });
    }

    // --- Buscar Artigos na API e Exibir ---
    // (Esta função foi MODIFICADA para criar o ÍNDICE)
    async function fetchAndDisplayArticles(filterType = 'all', value = '') {
        let apiUrl = '';
        contentArea.innerHTML = '<p>Carregando...</p>'; 

        try {
            // 1. Define a API URL
            if (filterType === 'search') apiUrl = `/api/articles/search?q=${encodeURIComponent(value)}`;
            else if (filterType === 'category') apiUrl = `/api/articles/category/${value}`;
            else apiUrl = '/api/articles/public';
            
            console.log("Buscando artigos em:", apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Erro na API (${response.status}) ao buscar artigos`);
            
            currentArticles = await response.json(); 
            console.log("Artigos recebidos:", currentArticles.length);

            // 2. Limpa a área de conteúdo
            contentArea.innerHTML = '';
            
            // 3. Renderiza o Título e o ÍNDICE (A NOVA LÓGICA)
            const h2 = document.createElement('h2');
            h2.className = 'content-index-title';
            
            if (filterType === 'search') {
                h2.textContent = `Resultados para: "${value}"`;
            } else if (filterType === 'category') {
                const categoryLink = categoryTreeContainer.querySelector(`a[data-category-id="${value}"]`);
                h2.textContent = categoryLink ? categoryLink.textContent : 'Artigos';
            } else {
                h2.textContent = 'Todos os Artigos';
            }
            contentArea.appendChild(h2);

            // 4. Se não houver artigos, mostre a mensagem e pare
            if (!currentArticles || currentArticles.length === 0) {
                const searchTerm = searchInput.value.trim();
                contentArea.innerHTML += searchTerm !== '' ? '<p>Nenhum resultado encontrado para sua busca.</p>' : '<p>Nenhum documento encontrado para esta seleção.</p>';
                updateArticleSelection(null);
                return;
            }

            // 5. Crie a lista (índice)
            const indexUl = document.createElement('ul');
            indexUl.className = 'article-index-list';
            currentArticles.forEach(article => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `#artigo-${article.id}`; // Link para a âncora
                a.className = 'internal-link'; // Reusa o estilo
                a.textContent = article.title;
                
                // Se for busca, mostra o snippet no índice
                if (article.snippet) {
                    const snippetP = document.createElement('p');
                    snippetP.className = 'search-snippet';
                    snippetP.innerHTML = `...${article.snippet}...`;
                    a.appendChild(snippetP);
                }
                
                li.appendChild(a);
                indexUl.appendChild(li);
            });
            contentArea.appendChild(indexUl);

            // 6. Adiciona um <hr>
            contentArea.appendChild(document.createElement('hr'));
            
            // 7. Renderiza o CONTEÚDO (as seções escondidas)
            renderArticleSections(currentArticles); 
            
            // 8. Atualiza a seleção (não mostra nenhum artigo, só o índice)
            updateArticleSelection(null);

            // 9. Atualiza o sidebar
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
        // ... (Esta função não muda) ...
        if (!categoryTreeContainer) return; 
        categoryTreeContainer.querySelectorAll('a').forEach(a => {
            a.classList.remove('active-category');
            if ((a.hash === '#all' && activeCategoryId === null) || 
                (a.dataset.categoryId && parseInt(a.dataset.categoryId) === activeCategoryId)) {
                a.classList.add('active-category');
            }
        });
    }
    
    // --- Ativar/Mostrar um Artigo Específico ---
    // (Esta função foi MODIFICADA para esconder o ÍNDICE)
    async function updateArticleSelection(targetArticleId = null) {
         console.log("Tentando ativar artigo:", targetArticleId);
         const currentActiveSection = contentArea.querySelector('.doc-section.active');
         if (currentActiveSection) { 
             currentActiveSection.classList.remove('active');
             currentActiveSection.style.display = 'none';
         }
         activeArticleId = targetArticleId;

         // Seleciona os elementos do índice
         const indexTitle = contentArea.querySelector('.content-index-title');
         const indexList = contentArea.querySelector('.article-index-list');
         const indexHr = contentArea.querySelector('hr');

         if (targetArticleId) {
             // Esconde o índice
             if (indexTitle) indexTitle.style.display = 'none';
             if (indexList) indexList.style.display = 'none';
             if (indexHr) indexHr.style.display = 'none';

             const newActiveSection = contentArea.querySelector(targetArticleId);
             if (newActiveSection) {
                 // Busca conteúdo completo se for de snippet (needsContent === "true")
                 if (newActiveSection.dataset.needsContent === "true") {
                     console.log(`Buscando conteúdo completo para ${targetArticleId}...`);
                     const articleIdNum = targetArticleId.split('-')[1]; 
                     try {
                         const response = await fetch(`/api/articles/public/${articleIdNum}`); 
                         if (!response.ok) { /* ... (tratamento de erro) ... */ }
                         const articleData = await response.json();
                         
                         const fullContentHtml = articleData.content_html || '';
                         
                         // Substitui o placeholder pelo conteúdo real
                         const placeholder = newActiveSection.querySelector('.search-snippet-placeholder');
                         if (placeholder) placeholder.innerHTML = fullContentHtml;
                         
                         newActiveSection.dataset.needsContent = "false";
                         initCopyCodeButtons();
                     } catch (error) {
                          console.error("Erro ao buscar conteúdo completo:", error);
                          newActiveSection.innerHTML += `<p style="color:red">Erro ao carregar.</p>`;
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
         } else {
             // Mostra o índice
             if (indexTitle) indexTitle.style.display = 'block';
             if (indexList) indexList.style.display = 'block';
             if (indexHr) indexHr.style.display = 'block';
         }
    }


    // --- Lógica da Busca ---
    let searchTimeout; 
    searchInput.addEventListener('input', (e) => {
        // ... (Esta função não muda) ...
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
            // ... (Esta função não muda) ...
            const link = e.target.closest('a');
            if (link) {
                e.preventDefault();
                const categoryId = link.dataset.categoryId;
                searchInput.value = ''; 
                fetchAndDisplayArticles(link.hash === '#all' ? 'all' : 'category', categoryId);
            }
        });
    }
    
     // --- Lógica de Clique nos Links (Índice ou Internos) ---
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
         // ... (Esta função não muda) ...
         if(categoryTreeContainer) categoryTreeContainer.innerHTML = 'Carregando categorias...';

         try {
             const flatCatResponse = await fetch('/api/categories'); 
             if (!flatCatResponse.ok) throw new Error(`Erro categorias (${flatCatResponse.status})`);
             const flatCategories = await flatCatResponse.json();
             currentCategoryTree = flatCategories; 

             const treeUl = renderSidebarTree(flatCategories);
             if(categoryTreeContainer) {
                 categoryTreeContainer.innerHTML = ''; 
                 categoryTreeContainer.appendChild(treeUl);
             }
             await fetchAndDisplayArticles('all');
         } catch (error) {
              console.error("Erro inicialização:", error);
              if(categoryTreeContainer) categoryTreeContainer.innerHTML = `<span style="color: red;">${error.message}</span>`;
              contentArea.innerHTML = '<p>Erro ao carregar a página.</p>';
         }
    }

    initializePage(); 

}); // Fim DOMContentLoaded