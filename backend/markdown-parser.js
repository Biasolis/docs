// backend/markdown-parser.js (CORRIGIDO para marked@4)
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
    try {
        // Garante que o markdown é uma string
        if (typeof markdownText !== 'string') {
            return '';
        }

        // Verifica se o cache está vazio (primeira execução) OU se está expirado
        if (articleTitleMap.size === 0 || (Date.now() - cacheTimestamp > CACHE_DURATION)) {
            console.log("[MarkdownParser] Cache vazio ou expirado. Atualizando...");
            await updateTitleMapCache();
        }

        // Configura o renderizador customizado
        const renderer = new marked.Renderer();
        const originalTextRenderer = renderer.text;

        renderer.text = (text) => {
            // *** CORREÇÃO ***
            // A versão 4 do marked.js espera o comportamento original.
            // Removemos o patch que retornava ''.
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
                    return `<a href="#artigo-${id}" class="internal-link" title="Ir para '${targetTitle}'">${display}</a>`;
                } else {
                    return `<span class="internal-link-broken" title="Artigo '${targetTitle}' não encontrado">${display}</span>`;
                }
            });
            // Chamamos a função original
            return originalTextRenderer.call(renderer, text);
        };
        
        // Garantir que links externos abram em nova aba
        const originalLinkRenderer = renderer.link;
        renderer.link = (href, title, text) => {
            if (href.startsWith('#artigo-')) {
                return `<a href="${href}" class="internal-link"${title ? ` title="${title}"` : ''}>${text}</a>`;
            }
            if (href && (href.startsWith('http') || href.startsWith('mailto:'))) {
                return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
            }
            return originalLinkRenderer.call(renderer, href, title, text);
        };

        marked.use({ renderer });
        
        // Tenta parsear o markdown
        return marked.parse(markdownText);
        
    } catch (err) {
        // Fallback de segurança
        console.error(`[MarkdownParser] Erro inesperado ao parsear o markdown. Conteúdo: "${markdownText.substring(0, 50)}..."`);
        console.error(err.message); 
        return `<p style="color:red;font-weight:bold;">Erro ao renderizar este artigo.</p>`;
    }
}

module.exports = { parseMarkdown };