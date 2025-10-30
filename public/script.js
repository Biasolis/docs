// /public/script.js

// Envolvemos todo o código original em uma função
function inicializarNavegacaoDocs() {
    
    // Espera o documento HTML ser completamente carregado
    // (Vamos manter isso por segurança, embora o public.js já vá fazer isso)
    document.addEventListener('DOMContentLoaded', () => {

        // 1. Seleciona todos os links da sidebar
        const sidebarLinks = document.querySelectorAll('.sidebar nav a');
        
        // 2. Seleciona todas as seções de documento
        const contentSections = document.querySelectorAll('.content .doc-section');

        // Se não houver links, não faz nada
        if (sidebarLinks.length === 0) return;

        // Função para esconder todas as seções e remover a classe 'active' dos links
        function hideAllSections() {
            contentSections.forEach(section => {
                section.classList.remove('active');
            });
            sidebarLinks.forEach(link => {
                link.classList.remove('active');
            });
        }

        // 3. Adiciona um "escutador" de clique para CADA link da sidebar
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (event) => {
                // Previne o comportamento padrão do link (que seria rolar a página)
                event.preventDefault();

                // Esconde tudo primeiro
                hideAllSections();

                // 4. Pega o alvo do link (ex: "#introducao")
                const targetId = link.getAttribute('href');
                
                // 5. Seleciona a seção de conteúdo correspondente
                const targetSection = document.querySelector(targetId);

                // 6. Adiciona a classe 'active' ao link clicado e à seção alvo
                if (targetSection) {
                    link.classList.add('active');
                    targetSection.classList.add('active');
                }
            });
        });

        // Opcional: Garante que a primeira seção esteja visível
        // (Isso já é feito pelo public.js, mas mantemos por segurança)
        if (sidebarLinks.length > 0 && !document.querySelector('.sidebar nav a.active')) {
            sidebarLinks[0].classList.add('active');
            const firstSectionId = sidebarLinks[0].getAttribute('href');
            const firstSection = document.querySelector(firstSectionId);
            if (firstSection) {
                firstSection.classList.add('active');
            }
        }
    });
}

// Chamamos a função imediatamente para o caso de carregamento normal
// (embora agora o public.js vá chamá-la de novo)
inicializarNavegacaoDocs();