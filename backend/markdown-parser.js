// backend/markdown-parser.js (NOVO ARQUIVO)
const { marked } = require('marked');
const db = require('./db'); // Importa a conexão com o banco

// Cache para o mapa de títulos
let articleTitleMap = new Map();
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos de cache

// Função para (re)popular o cache do mapa de títulos
async function updateTitleMapCache() {
    try {
        const query = `SELECT id, title FROM articles WHERE status = 'published_public';`;
        const result = await db.query(query);
        
        const newMap = new Map();
        result.rows.forEach(t => {
            newMap.set(t.title.toLowerCase().trim(), t.id);
        });
        
        articleTitleMap = newMap;
        cacheTimestamp = Date.now();
        console.log(`[MarkdownParser] Cache de títulos atualizado: ${articleTitleMap.size} entradas.`);
    } catch (err) {
        console.error("[MarkdownParser] Erro ao atualizar cache de títulos:", err);
    }
}

// Função principal para parsear o markdown
async function parseMarkdown(markdownText) {
    // Garante que o markdown é uma string
    if (typeof markdownText !== 'string') {
        return '';
    }

    // Verifica se o cache está expirado
    if (Date.now() - cacheTimestamp > CACHE_DURATION) {
        await updateTitleMapCache();
    }

    // Configura o renderizador customizado
    const renderer = new marked.Renderer();
    const originalTextRenderer = renderer.text;

    renderer.text = (text) => {
        if (typeof text !== 'string') {
            return originalTextRenderer.call(renderer, text);
        }

        // Lógica dos links internos [[...]]
        text = text.replace(/\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g, (match, title, displayText) => {
            const targetTitle = title.trim();
            const display = (displayText || targetTitle).trim();
            const normalizedTitle = targetTitle.toLowerCase();
            
            if (articleTitleMap.has(normalizedTitle)) {
                const id = articleTitleMap.get(normalizedTitle);
                // Gera um link que o public.js vai entender
                return `<a href="#artigo-${id}" class="internal-link" title="Ir para '${targetTitle}'">${display}</a>`;
            } else {
                return `<span class="internal-link-broken" title="Artigo '${targetTitle}' não encontrado">${display}</span>`;
            }
        });
        return originalTextRenderer.call(renderer, text);
    };
    
    // Garantir que links externos abram em nova aba
    const originalLinkRenderer = renderer.link;
    renderer.link = (href, title, text) => {
        if (href.startsWith('#artigo-')) {
            return `<a href="${href}" class="internal-link"${title ? ` title="${title}"` : ''}>${text}</a>`;
        }
        // Se for um link externo
        if (href && (href.startsWith('http') || href.startsWith('mailto:'))) {
            return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        }
        return originalLinkRenderer.call(renderer, href, title, text);
    };

    marked.use({ renderer });
    // marked.parse() é síncrono, mas nossa função é assíncrona por causa do cache
    return marked.parse(markdownText);
}

// Inicializa o cache na primeira vez que o módulo é carregado
updateTitleMapCache();

module.exports = { parseMarkdown };