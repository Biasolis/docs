// /backend/db.js (COMPLETO - MODIFICADO PARA ENV VARS)
const { Pool } = require('pg');

// Lê as configurações das variáveis de ambiente
const pool = new Pool({
    user: process.env.DB_USER || 'docs_user',
    host: process.env.DB_HOST || '172.16.13.34',
    database: process.env.DB_NAME || 'docs_db_hol',
    password: process.env.DB_PASSWORD || 'jJsxVBEZJu8n3wnSX92r',
    port: process.env.DB_PORT || 5432,
});

// Teste de conexão opcional
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Erro ao conectar ao PostgreSQL:', err);
    } else {
        console.log('Conectado ao PostgreSQL com sucesso.');
    }
});

// Exporta a função 'query' e o 'pool'
module.exports = {
    query: (text, params) => pool.query(text, params),
    pool: pool // Essencial para transações
};