// /public/darkmode.js (CORRIGIDO)

(function() {
    
    function applyTheme(theme) {
        // Adicionamos uma verificação extra por segurança, 
        // mas o DOMContentLoaded deve garantir que body existe.
        if (!document.body) { 
            console.warn('applyTheme called before document.body exists.');
            return; 
        }
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    // --- Lemos a preferência de tema o mais cedo possível ---
    const savedTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    // --- AGORA, esperamos o DOM carregar para APLICAR o tema e configurar o botão ---
    document.addEventListener('DOMContentLoaded', () => {
        
        // --- Aplica o tema inicial SÓ AGORA ---
        applyTheme(savedTheme);

        // --- Configura o botão toggle ---
        const toggle = document.getElementById('darkModeToggle');
        if (!toggle) return; // Sai se a página não tiver o botão

        // Seta o estado visual do botão
        if (savedTheme === 'dark') {
            toggle.checked = true;
        }

        // Adiciona o 'listener' para mudanças
        toggle.addEventListener('change', function(e) {
            const newTheme = e.target.checked ? 'dark' : 'light';
            applyTheme(newTheme);
            localStorage.setItem('theme', newTheme);
        });
    });

})(); // Fim da IIFE