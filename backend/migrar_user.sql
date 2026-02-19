UPDATE users 
SET sector_id = (SELECT id FROM sectors WHERE slug = 'geral') 
WHERE sector_id IS NULL;