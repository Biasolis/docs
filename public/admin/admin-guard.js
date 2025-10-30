// /public/admin/admin-guard.js
// (Este é o "Guarda de Admin" - Verifica login E permissão)

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

// 1. O usuário está logado?
if (!token) {
    // Se não, expulsa para o login
    window.location.replace('/admin/login.html');
}

// 2. O usuário é ADMIN?
if (user && user.role !== 'admin') {
    // Se estiver logado, MAS NÃO FOR ADMIN:
    alert('Acesso negado. Você não tem permissão de administrador para acessar esta página.');
    // Expulsa para o dashboard
    window.location.replace('/admin/dashboard.html');
}