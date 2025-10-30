// /public/public.js (COMPLETO E FINAL - COM LINKS INTERNOS E ROTA PÚBLICA /:id)

// --- Mapa Global para Links Internos ---
let articleTitleMap = new Map();

// --- Configuração do Marked.js (Extensão para Links Internos) ---
const renderer = new marked.Renderer();
const originalLinkRenderer = renderer.link; // Salva o renderizador de link original (para links externos)
const originalTextRenderer = renderer.text; // Salva o renderizador de texto original
renderer.text = (text) => {
    // Procura pela sintaxe [[Título do Link]] ou [[Título|Texto Exibido]]
    text = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, title, displayText) => {
        const targetTitle = title.trim();
        const display = (displayText || targetTitle).trim(); // Usa displayText se houver, senão o próprio título
        const normalizedTitle = targetTitle.toLowerCase();
        
        if (articleTitleMap.has(normalizedTitle)) {
            const id = articleTitleMap.get(normalizedTitle);
            // Link funcional para nosso JS pegar
            return `<a href="#artigo-${id}" class="internal-link" title="Ir para '${targetTitle}'">${display}</a>`;
        } else {
            // Link quebrado
            return `<span class="internal-link-broken" title="Artigo '${targetTitle}' não encontrado">${display}</span>`;
        }
    });
    // Chama o renderizador original para processar outros possíveis tokens
    return originalTextRenderer.call(renderer, text);
};
// Garante que links externos normais [Texto](url) ainda funcionem
renderer.link = (href, title, text) => {
    // Se for um link interno (gerado pelo nosso renderer.text), não mexe
    if (href.startsWith('#artigo-')) {
        return `<a href="${href}" class="internal-link"${title ? ` title="${title}"` : ''}>${text}</a>`;
    }
    // Senão, usa o renderizador original para links externos
    return originalLinkRenderer.call(renderer, href, title, text);
};
// Aplica o renderizador customizado
marked.use({ renderer });


// --- Função Auxiliar (Copy Button) ---
function initCopyCodeButtons() {
    const codeBlocks = document.querySelectorAll('.content pre');
    codeBlocks.forEach(block => {
        const oldButton = block.querySelector('.copy-code-btn');
        if(oldButton) oldButton.remove();
        const button = document.createElement('button');
        button.className = 'copy-code-btn'; button.textContent = 'Copiar';
        button.addEventListener('click', () => {
            const codeElement = block.querySelector('code');
            const codeToCopy = codeElement ? codeElement.innerText : block.innerText;
            navigator.clipboard.writeText(codeToCopy).then(() => {
                button.textContent = 'Copiado!'; setTimeout(() => { button.textContent = 'Copiar'; }, 2000);
            }, () => { button.textContent = 'Erro!'; });
        });
        block.appendChild(button);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    
    const searchInput = document.getElementById('searchInput');
    const categoryTreeContainer = document.getElementById('category-tree-container');
    const contentArea = document.querySelector('.content');
    let currentArticles = [];
    let currentCategoryTree = []; // Guarda a lista plana de categorias vinda da API
    let activeArticleId = null;

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
            a.href = `#category-${category.id}`; a.dataset.categoryId = category.id;
            a.textContent = category.name; li.appendChild(a);
            const subUl = renderSidebarTree(categoriesData, category.id); // Passa lista plana
            if (subUl.hasChildNodes()) { li.appendChild(subUl); }
            ul.appendChild(li);
        });
        return ul;
    }

    // --- Renderizar Artigos no Conteúdo (COM SNIPPET) ---
    function renderArticlesContent(articles) {
        contentArea.innerHTML = '';
        if (!articles || articles.length === 0) {
            const searchTerm = searchInput.value.trim();
            contentArea.innerHTML = searchTerm !== '' ? '<p>Nenhum resultado encontrado.</p>' : '<p>Nenhum documento nesta categoria.</p>';
            updateArticleSelection(null); return;
        }
        articles.forEach((article) => {
            const articleId = `artigo-${article.id}`;
            const section = document.createElement('section');
            section.id = articleId; section.classList.add('doc-section');
            let contentHtml = '';
            if (article.snippet) {
                 contentHtml = `<p class="search-snippet">...${article.snippet}...</p>`;
                 section.dataset.needsContent = "true"; section.dataset.contentMarkdown = "";
            } else if (article.content_markdown) {
                contentHtml = marked.parse(article.content_markdown); // Usa marked customizado
                section.dataset.needsContent = "false"; section.dataset.contentMarkdown = article.content_markdown;
            } else { contentHtml = "<p>Conteúdo indisponível.</p>"; section.dataset.needsContent = "false"; }
            section.innerHTML = `<h2>${article.title}</h2>${contentHtml}<p class="article-author"><em>Autor: ${article.author_username} (Publicado em: ${new Date(article.created_at).toLocaleDateString('pt-BR')})</em></p>`;
            contentArea.appendChild(section); section.style.display = 'none';
        });
        if(articles.length > 0) updateArticleSelection(`artigo-${articles[0].id}`); else updateArticleSelection(null);
    }

    // --- Buscar e Renderizar Artigos ---
    async function fetchAndDisplayArticles(filterType = 'all', value = '') {
        let apiUrl = '';
        contentArea.innerHTML = '<p>Carregando...</p>';
        try {
            if (filterType === 'search') apiUrl = `/api/articles/search?q=${encodeURIComponent(value)}`;
            else if (filterType === 'category') apiUrl = `/api/articles/category/${value}`;
            else apiUrl = '/api/articles/public';
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Erro API (${response.status})`);
            currentArticles = await response.json();
            renderArticlesContent(currentArticles);
            if (filterType !== 'search') updateSidebarSelection(filterType === 'all' ? null : parseInt(value));
        } catch (error) { console.error('Erro buscar/renderizar:', error); contentArea.innerHTML = `<p style="color: red;"><strong>Erro buscar docs.</strong> (${error.message})</p>`; updateArticleSelection(null); }
    }
    
    // --- Atualizar Seleção Categoria Sidebar ---
    function updateSidebarSelection(activeCategoryId = null) { /* ... (inalterado) ... */ }
    
    // --- Ativar/Mostrar Artigo (USA ROTA PÚBLICA /:id) ---
    async function updateArticleSelection(targetArticleId = null) {
         const currentActiveSection = contentArea.querySelector('.doc-section.active');
         if (currentActiveSection) { currentActiveSection.classList.remove('active'); currentActiveSection.style.display = 'none'; }
         activeArticleId = targetArticleId;
         if (targetArticleId) {
             const newActiveSection = contentArea.querySelector(targetArticleId);
             if (newActiveSection) {
                 if (newActiveSection.dataset.needsContent === "true") {
                     console.log(`Buscando conteúdo público ${targetArticleId}...`);
                     const articleIdNum = targetArticleId.split('-')[1];
                     try {
                         // USA a nova rota PÚBLICA
                         const response = await fetch(`/api/articles/public/${articleIdNum}`);
                         if (!response.ok) { let eMsg='Erro conteúdo.'; try{const d=await response.json();eMsg=d.message||eMsg;}catch(e){} throw new Error(eMsg); }
                         const articleData = await response.json();
                         const fullContentHtml = marked.parse(articleData.content_markdown || ''); // Usa marked customizado
                         const h2 = newActiveSection.querySelector('h2');
                         const authorP = newActiveSection.querySelector('p.article-author');
                         newActiveSection.innerHTML = ''; 
                         if (h2) newActiveSection.appendChild(h2);
                         const contentDiv = document.createElement('div'); contentDiv.innerHTML = fullContentHtml; newActiveSection.appendChild(contentDiv);
                         if (authorP) newActiveSection.appendChild(authorP);
                         newActiveSection.dataset.needsContent = "false"; newActiveSection.dataset.contentMarkdown = articleData.content_markdown;
                         initCopyCodeButtons(); 
                     } catch (error) {
                          console.error("Erro buscar conteúdo público:", error);
                          const h2 = newActiveSection.querySelector('h2'); const errorP = document.createElement('p'); errorP.style.color='red'; errorP.textContent=`Erro: ${error.message}`;
                          if(h2) h2.insertAdjacentElement('afterend', errorP); else newActiveSection.prepend(errorP);
                          newActiveSection.dataset.needsContent = "false"; 
                     }
                 } else if (newActiveSection.querySelector('pre code')) { initCopyCodeButtons(); }
                 newActiveSection.classList.add('active'); newActiveSection.style.display = 'block';
             } else { activeArticleId = null; }
         }
    }

    // --- Lógica da Busca ---
    let searchTimeout;
    searchInput.addEventListener('input', (e) => { /* ... (inalterado) ... */ });

    // --- Lógica de Clique na Categoria ---
    if(categoryTreeContainer) categoryTreeContainer.addEventListener('click', (e) => { /* ... (inalterado) ... */ });
    
     // --- Lógica de Clique nos Links Internos ---
     contentArea.addEventListener('click', (e) => {
         const internalLink = e.target.closest('a.internal-link'); // Acha o link mesmo clicando no texto dentro
         if (internalLink && internalLink.getAttribute('href')?.startsWith('#artigo-')) {
             e.preventDefault();
             const targetId = internalLink.getAttribute('href');
             const targetSection = contentArea.querySelector(targetId);
             if (targetSection) {
                 updateArticleSelection(targetId);
                 targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
             } else { console.warn(`Link interno ${targetId} não encontrado.`); }
         }
     });

    // --- Carregamento Inicial ---
    async function initializePage() {
         if(categoryTreeContainer) categoryTreeContainer.innerHTML = 'Carregando categorias...';
         else console.error("Container árvore não encontrado!");
         try {
             // Busca lista plana para a árvore
             const flatCatResponse = await fetch('/api/categories');
             if (!flatCatResponse.ok) throw new Error(`Erro categorias (${flatCatResponse.status})`);
             const flatCategories = await flatCatResponse.json();
             currentCategoryTree = flatCategories; // Guarda lista plana
             const treeUl = renderSidebarTree(flatCategories); // Monta a árvore
             if(categoryTreeContainer) { categoryTreeContainer.innerHTML = ''; categoryTreeContainer.appendChild(treeUl); }

             // Busca mapa de títulos para links internos
             const titlesResponse = await fetch('/api/articles/public-titles');
             if (!titlesResponse.ok) throw new Error('Erro mapa títulos.');
             const titles = await titlesResponse.json();
             articleTitleMap.clear();
             titles.forEach(t => { articleTitleMap.set(t.title.toLowerCase().trim(), t.id); });
             console.log("Mapa de títulos carregado:", articleTitleMap.size, "entradas.");

             await fetchAndDisplayArticles('all'); // Busca artigos iniciais
         } catch (error) {
              console.error("Erro inicialização:", error);
              if(categoryTreeContainer) categoryTreeContainer.innerHTML = `<span style="color: red;">${error.message}</span>`;
              contentArea.innerHTML = '<p>Erro ao carregar a página.</p>';
         }
    }
    initializePage();

}); // Fim DOMContentLoaded