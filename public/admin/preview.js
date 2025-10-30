// /public/admin/preview.js (SIMPLIFICADO - SEM MARKED.JS)

// 'token' e 'user' são declarados em 'auth.js'
console.log('preview.js carregado (Modo SSR).');

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
            // Esta rota agora retorna 'content_html'
            const response = await fetch(`/api/articles/${articleId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                 let errorMsg = 'Artigo não encontrado ou acesso negado.';
                 try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch(e){}
                 throw new Error(errorMsg);
            }
            
            const article = await response.json();
            
            // Pega o HTML pronto da API, em vez de usar marked.parse()
            const contentHtml = article.content_html || '';
            
            contentArea.innerHTML = `
                <h2>${article.title}</h2>
                ${contentHtml}
                <p class="article-author"><em>Autor: ${article.author_username} (Criado em: ${new Date(article.created_at).toLocaleDateString('pt-BR')})</em></p>
            `;
            
            initCopyCodeButtons(); // Adiciona botões de copiar

        } catch (error) {
            console.error("Erro ao carregar (preview):", error);
            contentArea.innerHTML = `<h2 style="color: red;">Erro ao carregar: ${error.message}</h2>`;
        }
    }
    
    // --- Carregamento Inicial ---
    async function initializePage() {
        contentArea.innerHTML = '<h2>Carregando...</h2>';
        
        try {
            // Pega o ID do artigo da URL
            const urlParams = new URLSearchParams(window.location.search);
            const articleId = urlParams.get('id');

            // Busca e renderiza o conteúdo do artigo (que já virá em HTML)
            // (Não precisamos mais buscar mapa de títulos)
            await fetchArticleContent(articleId);

        } catch (error) {
            console.error("Na inicialização (preview):", error);
            contentArea.innerHTML = `<p style="color: red;">${error.message}</p>`;
        }
    }
    
    initializePage(); // Inicia
});