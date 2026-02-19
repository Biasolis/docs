// /frontend/src/services/api.js (COMPLETO)
import axios from 'axios';

// Cria a instância do axios apontando para o seu backend
const api = axios.create({
  // Em desenvolvimento aponta para a porta 3055. 
  // Em produção (quando a build roda junto no server.js), ele usa a rota relativa.
  baseURL: import.meta.env.MODE === 'development' ? 'http://localhost:3055/api' : '/api',
});

// Interceptor de Requisição: Adiciona o token JWT automaticamente em TODAS as chamadas
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Resposta: Lida com tokens expirados (Erro 401 ou 403) de forma global
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Se não autorizado (token expirou ou acesso negado), limpa o storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Se o usuário estiver tentando acessar uma rota de admin e deu erro de token, manda pro login
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;