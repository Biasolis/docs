// /public/admin/login.js (ATUALIZADO)

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        // MUDANÇA AQUI: Pega 'email' em vez de 'username'
        const email = event.target.email.value;
        const password = event.target.password.value;
        
        errorMessage.textContent = '';

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                // MUDANÇA AQUI: Envia 'email'
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Erro ao tentar logar.');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = '/admin/dashboard.html';

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });
});