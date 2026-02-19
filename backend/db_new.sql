-- 1. Criar a tabela de setores
CREATE TABLE sectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Criar o Setor Padrão (Migração dos dados legados)
INSERT INTO sectors (name, slug, description) 
VALUES ('Geral', 'geral', 'Setor principal (Migrado do sistema legado)');

-- 3. Atualizar a tabela de Usuários
-- O 'role' antigo era VARCHAR(10), 'super_admin' tem 11 caracteres, então precisamos aumentar o tamanho
ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20);

-- Remover a restrição antiga (user, admin) e adicionar a nova com os 4 níveis
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'editor', 'admin', 'super_admin'));

-- Adicionar a ligação ao setor no usuário
ALTER TABLE users ADD COLUMN sector_id INTEGER REFERENCES sectors(id);

-- Promover os admins antigos a super_admin (para não perder o acesso global)
UPDATE users SET role = 'super_admin' WHERE role = 'admin';

-- Associar os utilizadores normais ao setor 'geral'
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE slug = 'geral') WHERE role != 'super_admin';

-- 4. Atualizar a tabela de Categorias
ALTER TABLE categories ADD COLUMN sector_id INTEGER REFERENCES sectors(id);
-- Vincula as categorias existentes ao setor Geral
UPDATE categories SET sector_id = (SELECT id FROM sectors WHERE slug = 'geral');
-- Garante que daqui para frente toda categoria pertença a um setor
ALTER TABLE categories ALTER COLUMN sector_id SET NOT NULL;

-- 5. Atualizar a tabela de Artigos
ALTER TABLE articles ADD COLUMN sector_id INTEGER REFERENCES sectors(id);
-- Vincula os artigos existentes ao setor Geral
UPDATE articles SET sector_id = (SELECT id FROM sectors WHERE slug = 'geral');
-- Garante que daqui para frente todo artigo pertença a um setor
ALTER TABLE articles ALTER COLUMN sector_id SET NOT NULL;

ALTER TABLE sectors ADD COLUMN ai_active BOOLEAN DEFAULT false;
ALTER TABLE sectors ADD COLUMN gemini_api_key VARCHAR(255);
ALTER TABLE sectors ADD COLUMN ai_last_sync TIMESTAMP;

DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE sectors ADD COLUMN ai_active BOOLEAN DEFAULT false;
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE sectors ADD COLUMN gemini_api_key VARCHAR(255);
    EXCEPTION WHEN duplicate_column THEN END;

    BEGIN
        ALTER TABLE sectors ADD COLUMN ai_last_sync TIMESTAMP;
    EXCEPTION WHEN duplicate_column THEN END;
END $$;