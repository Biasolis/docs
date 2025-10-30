// /public/admin/auth.js
// (Este é o "Guarda Simples" - SÓ verifica o login)

const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

if (!token) {
    // Se não houver token, redireciona para o login
    window.location.replace('/admin/login.html');
}