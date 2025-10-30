// /public/admin/preview.js (COMPLETO - CORRIGIDO)

// 'token' e 'user' são declarados em 'auth.js'
console.log('preview.js carregado.');

// --- Mapa Global para Links Internos ---
let articleTitleMap = new Map();

// --- Configuração do Marked.js (COM CORREÇÃO) ---
const renderer = new marked.Renderer();
const originalLinkRenderer = renderer.link; 
const originalTextRenderer = renderer.text; 
renderer.text = (text) => {
    // (CORREÇÃO) Adiciona verificação para garantir que 'text' é uma string
    if (typeof text !== 'string') {
        return originalTextRenderer.call(renderer, text);
    }
    
    // Procura por [[Título]] ou [[Título|Texto Exibido]]
    text = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, title, displayText) => {
        const targetTitle = title.trim();
        const display = (displayText || targetTitle).trim();
        const normalizedTitle = targetTitle.toLowerCase();
        
        if (articleTitleMap.has(normalizedTitle)) {
            const id = articleTitleMap.get(normalizedTitle);
            return `<a href="/#artigo-${id}" target="_blank" class="internal-link" title="Abrir '${targetTitle}' em nova aba">${display}</a>`;
        } else {
            return `<span class="internal-link-broken" title="Artigo '${targetTitle}' não encontrado">${display}</span>`;
        }
    });
    return originalTextRenderer.call(renderer, text);
};
renderer.link = (href, title, text) => {
    if (href.startsWith('/#artigo-')) {
        return `<a href="${href}" target="_blank" class="internal-link"${title ? ` title="${title}"` : ''}>${text}</a>`;
    }
    return originalLinkRenderer.call(renderer, href, title, text);
};
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
                button.textContent = 'Copiado!';
                setTimeout(() => { button.textContent = 'Copiar'; }, 2000);
            }, () => { button.textContent = 'Erro!'; });
        });
        block.appendChild(button);
    });
}

// --- Lógica Principal ---
document.addEventListener('DOMContentLoaded', () => {
    
    const contentArea = document.getElementById('preview-content');
    
    // --- Função para Buscar Conteúdo do Artigo ---
    async function fetchArticleContent(articleId) {
        if (!articleId) {
            contentArea.innerHTML = '<h2>ID do artigo não fornecido.</h2>';
            return;
        }
        try {
            const response = await fetch(`/api/articles/${articleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                 let errorMsg = 'Artigo não encontrado ou acesso negado.';
                 try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch(e){}
                 throw new Error(errorMsg);
            }
            
            const article = await response.json();
            
            // CORREÇÃO: Garante que estamos passando uma string para o marked.parse
            const markdownContent = article.content_markdown || '';
            const contentHtml = marked.parse(markdownContent);
            
            contentArea.innerHTML = `
                <h2>${article.title}</h2>
                ${contentHtml}
                <p class="article-author"><em>Autor: ${article.author_username} (Criado em: ${new Date(article.created_at).toLocaleDateString('pt-BR')})</em></p>
            `;
            
            initCopyCodeButtons();

        } catch (error) {
            console.error("Erro ao carregar (preview):", error);
            contentArea.innerHTML = `<h2 style="color: red;">Erro ao carregar: ${error.message}</h2>`;
        }
    }
    
    // --- Carregamento Inicial ---
    async function initializePage() {
        contentArea.innerHTML = '<h2>Carregando...</h2>';
        
        try {
            // 1. Busca o mapa de títulos
            const titlesResponse = await fetch('/api/articles/public-titles');
            if (!titlesResponse.ok) throw new Error('Erro ao buscar mapa de títulos.');
            const titles = await titlesResponse.json();
            
            articleTitleMap.clear();
            titles.forEach(t => { articleTitleMap.set(t.title.toLowerCase().trim(), t.id); });
            console.log("Mapa de títulos carregado (preview):", articleTitleMap.size, "entradas.");

            // 2. Pega o ID do artigo da URL
            const urlParams = new URLSearchParams(window.location.search);
            const articleId = urlParams.get('id');

            // 3. Busca e renderiza o conteúdo do artigo
            await fetchArticleContent(articleId);

        } catch (error) {
            console.error("Erro na inicialização (preview):", error);
            contentArea.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }
    
    initializePage(); // Inicia
});