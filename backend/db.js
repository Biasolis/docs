// /backend/db.js (COMPLETO - MODIFICADO PARA ENV VARS)
const { Pool } = require('pg');

// Lê as configurações das variáveis de ambiente
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'seu_banco_de_dados',
    password: process.env.DB_PASSWORD || 'sua_senha_do_banco',
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