// hash.js
const bcrypt = require('bcryptjs');

// Pegue a senha do argumento do terminal
const senha = process.argv[2];

if (!senha) {
    console.error('Por favor, forneça uma senha!');
    console.log('Uso: node hash.js "sua-senha-aqui"');
    process.exit(1);
}

const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(senha, salt);

console.log('Sua senha: ' + senha);
console.log('Seu Hash (para o banco):');
console.log(hash);