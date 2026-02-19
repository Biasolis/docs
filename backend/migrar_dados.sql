-- 1. Transferir todos os Utilizadores do 'geral' para 'infraestrutura'
UPDATE users 
SET sector_id = (SELECT id FROM sectors WHERE slug = 'infraestrutura') 
WHERE sector_id = (SELECT id FROM sectors WHERE slug = 'geral');

-- 2. Transferir todas as Categorias do 'geral' para 'infraestrutura'
UPDATE categories 
SET sector_id = (SELECT id FROM sectors WHERE slug = 'infraestrutura') 
WHERE sector_id = (SELECT id FROM sectors WHERE slug = 'geral');

-- 3. Transferir todos os Artigos do 'geral' para 'infraestrutura'
UPDATE articles 
SET sector_id = (SELECT id FROM sectors WHERE slug = 'infraestrutura') 
WHERE sector_id = (SELECT id FROM sectors WHERE slug = 'geral');

-- 4. Agora que o 'geral' está vazio, podemos apagá-lo em segurança
DELETE FROM sectors WHERE slug = 'geral';

ALTER TABLE articles ALTER COLUMN status TYPE VARCHAR(50);

-- 1. Remove a regra (constraint) antiga
ALTER TABLE articles DROP CONSTRAINT articles_status_check;

-- 2. Cria a nova regra incluindo o nosso novo status
ALTER TABLE articles ADD CONSTRAINT articles_status_check CHECK (status IN ('draft', 'published_internal_private', 'published_internal', 'published_public'));